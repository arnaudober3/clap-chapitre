/**
 * The back-office reads, all of them behind the admin token.
 *
 * Same shape as `content.ts` — one hook per view — with one difference that
 * matters: every request here goes out with `admin: true`, and a 401 signs the
 * editor out through `client.ts`. These endpoints return view counts and
 * unpublished drafts, so an anonymous caller must get nothing, not a filtered
 * version.
 */
import { useMemo } from 'react';
import { useApi, type Query } from './useApi';
import { toArticle, toBilan, toPublishedArticle } from './map';
import type { ArticleQuery, BilanQuery } from '../content/query';
import type { Draft, KpiStat, LeaderboardEntry, Period, TrendPoint } from '../content/dashboard';
import type {
  Article,
  Bilan,
  DraftBilan,
  PublishedArticle,
  WireArticle,
  WireBilan,
  WirePublishedArticle,
} from '../../shared/content';

const ADMIN = { admin: true } as const;

type Mapped<T> = Omit<Query<unknown>, 'data'> & { data?: T };

function useMapped<W, T>(query: Query<W>, map: (wire: W) => T): Mapped<T> {
  const data = useMemo(() => (query.data ? map(query.data) : undefined), [query.data]);
  return { ...query, data };
}

/**
 * Turn a listing query into a query string, leaving out what means "no filter".
 *
 * Omitting rather than sending `status=all` keeps the URL — and therefore the
 * deduplication key and anything reading a network log — readable.
 */
function articleParams(query: ArticleQuery, page: number): string {
  const params = new URLSearchParams({ sort: query.sort, page: String(page) });
  if (query.status !== 'all') params.set('status', query.status);
  if (query.medium !== 'all') params.set('medium', query.medium);
  if (query.search.trim()) params.set('search', query.search.trim());
  return params.toString();
}

export interface AdminArticleList {
  items: Article[];
  total: number;
  page: number;
  perPage: number;
  /** The unfiltered totals of the "32 avis · 2 brouillons" line. */
  catalogue: { total: number; drafts: number };
}

export function useAdminArticles(query: ArticleQuery, page: number): Mapped<AdminArticleList> {
  const result = useApi<{
    items: WireArticle[];
    total: number;
    page: number;
    perPage: number;
    catalogue: { total: number; drafts: number };
  }>(`/api/admin/articles?${articleParams(query, page)}`, ADMIN);

  return useMapped(result, (payload) => ({ ...payload, items: payload.items.map(toArticle) }));
}

/** One avis for the editor — a draft included, which the public route refuses. */
export function useAdminArticle(id: string | undefined): Mapped<Article> {
  const result = useApi<{ article: WireArticle }>(
    id ? `/api/admin/articles/${encodeURIComponent(id)}` : null,
    ADMIN,
  );
  return useMapped(result, (payload) => toArticle(payload.article));
}

export interface AdminBilanList {
  items: Bilan[];
  total: number;
  page: number;
  perPage: number;
  /** The month in progress, shown as its own card above the table. */
  draft?: DraftBilan;
  catalogue: {
    published: number;
    drafts: number;
    /** The oldest published month, as figures — the page words it. */
    since?: { year: number; month: number };
  };
}

export function useAdminBilans(query: BilanQuery, page: number): Mapped<AdminBilanList> {
  const params = new URLSearchParams({ sort: query.sort, page: String(page) });
  if (query.search.trim()) params.set('search', query.search.trim());

  const result = useApi<{
    items: WireBilan[];
    total: number;
    page: number;
    perPage: number;
    draft: WireBilan | null;
    catalogue: { published: number; drafts: number; since: { year: number; month: number } | null };
  }>(`/api/admin/bilans?${params}`, ADMIN);

  return useMapped(result, (payload) => {
    const draft = payload.draft ? toBilan(payload.draft) : undefined;
    return {
      ...payload,
      items: payload.items.map(toBilan),
      // The endpoint only ever puts a draft there, but the type is the union.
      draft: draft?.status === 'draft' ? draft : undefined,
      catalogue: { ...payload.catalogue, since: payload.catalogue.since ?? undefined },
    };
  });
}

export function useAdminBilan(id: string | undefined): Mapped<Bilan> {
  const result = useApi<{ bilan: WireBilan }>(
    id ? `/api/admin/bilans/${encodeURIComponent(id)}` : null,
    ADMIN,
  );
  return useMapped(result, (payload) => toBilan(payload.bilan));
}

/**
 * The month a new bilan would cover: the one after the newest on file.
 *
 * Absent when the catalogue is empty — there is nothing to count from, and
 * guessing from the server's clock would make the form say something different
 * depending on when it was opened.
 */
export function useNextBilanMonth(): Mapped<{ id: string; year: number; month: number } | undefined> {
  const result = useApi<{ next: { id: string; year: number; month: number } | null }>(
    '/api/admin/bilans/next',
    ADMIN,
  );
  return useMapped(result, (payload) => payload.next ?? undefined);
}

/**
 * The avis the bilan editor can add as coups de cœur: published only, newest
 * first, and a wide page because the picker shows the whole catalogue.
 */
export function usePickerArticles(): Mapped<PublishedArticle[]> {
  const result = useApi<{ items: WirePublishedArticle[] }>(
    '/api/admin/articles?status=published&sort=recent&perPage=100',
    ADMIN,
  );
  return useMapped(result, (payload) => payload.items.map(toPublishedArticle));
}

export interface DashboardData {
  periods: Period[];
  defaultPeriod: string;
  /** The period actually served — the request's, or the default when it was unknown. */
  period: string;
  kpis: KpiStat[];
  leaderboard: LeaderboardEntry[];
  trend: TrendPoint[];
  trendPeak: TrendPoint;
  /** Unfinished avis and bilans. `kind` says which; the card labels them alike. */
  drafts: Array<Pick<Draft, 'id' | 'title' | 'kind'>>;
}

/** The whole tableau de bord: six cards, one request. */
export function useAdminDashboard(period: string | undefined): Query<DashboardData> {
  const params = period ? `?period=${encodeURIComponent(period)}` : '';
  return useApi<DashboardData>(`/api/admin/dashboard${params}`, ADMIN);
}

/** One entry of the moderation queue. ISO dates, as everywhere on the wire. */
export interface ModerationComment {
  id: string;
  targetType: 'article' | 'bilan';
  targetId: string;
  /** The avis' or month's title — the queue mixes every thread. */
  targetTitle: string;
  isReply: boolean;
  author: string;
  body: string;
  date?: string;
  createdAt?: string;
  likes: number;
  status: 'pending' | 'approved';
}

export interface ModerationList {
  items: ModerationComment[];
  total: number;
  page: number;
  perPage: number;
  /** The whole backlog, unfiltered — the nav badge reads it. */
  pending: number;
}

/**
 * The moderation queue. Defaults to what is waiting, since that is the only
 * reason to open the screen; `status: 'all'` shows everything.
 */
export function useAdminComments(
  status: 'pending' | 'approved' | 'all' = 'pending',
  page = 1,
): Query<ModerationList> {
  const params = new URLSearchParams({ page: String(page) });
  if (status !== 'all') params.set('status', status);
  return useApi<ModerationList>(`/api/admin/comments?${params}`, ADMIN);
}
