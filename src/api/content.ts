/**
 * One hook per view — the replacement for the selectors that used to live in
 * `src/mock/`.
 *
 * Each hook owns the URL it reads and the mapping that follows, so a page states
 * what it wants ("the film feed", "this avis and everything around it") instead
 * of assembling a query string. Filtering and sorting happen in SQL, at the
 * endpoint; nothing here re-filters what the server already narrowed.
 *
 * The mapping runs in a `useMemo` keyed on the payload: it rebuilds date strings
 * for a whole list, and a render that touches nothing should not redo it.
 */
import { useMemo } from 'react';
import { useApi, type Query } from './useApi';
import { toComment, toPublishedArticle, toPublishedBilan } from './map';
import type {
  Comment,
  Medium,
  PublishedArticle,
  PublishedBilan,
  WireComment,
  WirePublishedArticle,
  WirePublishedBilan,
} from '../../shared/content';
import type { AProposContent } from '../content/apropos';
import type { MeSuivreContent } from '../content/mesuivre';

export type { AProposContent } from '../content/apropos';
export type { MeSuivreContent } from '../content/mesuivre';

/** A view whose payload has been mapped, keeping the query's own state. */
type Mapped<T> = Omit<Query<unknown>, 'data'> & { data?: T };

function useMapped<W, T>(query: Query<W>, map: (wire: W) => T): Mapped<T> {
  const data = useMemo(() => (query.data ? map(query.data) : undefined), [query.data]);
  return { ...query, data };
}

/* -------------------------------------------------------------------------- */
/* Avis                                                                        */
/* -------------------------------------------------------------------------- */

/** The medium's newest avis: the home hero plus the cards under it. */
export function useFeed(medium: Medium | undefined, limit?: number): Mapped<PublishedArticle[]> {
  const params = new URLSearchParams();
  if (medium) params.set('medium', medium);
  if (limit) params.set('limit', String(limit));
  const query = useApi<{ items: WirePublishedArticle[] }>(`/api/feed?${params}`);
  return useMapped(query, (payload) => payload.items.map(toPublishedArticle));
}

export interface ArticleList {
  items: PublishedArticle[];
  total: number;
  page: number;
  perPage: number;
}

/**
 * The archive of one medium.
 *
 * `total` comes back alongside the rows so a caller can tell whether it is
 * showing everything — the archive page asks for a wide page and does not
 * paginate, which holds as long as a medium has fewer avis than `perPage`.
 */
export function useArticleList(
  medium: Medium | undefined,
  page = 1,
  perPage?: number,
): Mapped<ArticleList> {
  const params = new URLSearchParams({ page: String(page) });
  if (medium) params.set('medium', medium);
  if (perPage) params.set('perPage', String(perPage));
  const query = useApi<{
    items: WirePublishedArticle[];
    total: number;
    page: number;
    perPage: number;
  }>(`/api/articles?${params}`);
  return useMapped(query, (payload) => ({
    ...payload,
    items: payload.items.map(toPublishedArticle),
  }));
}

/** An avis with the note explaining why it is worth reading next. */
export type RelatedArticle = PublishedArticle & { note: string };

/**
 * The bilan an avis belongs to, reduced to what the breadcrumb shows.
 *
 * Not a `PublishedBilan`: the crumb needs a month and a link, and sending the
 * whole month — its avis included — to render two words would make the avis
 * request carry the bilan request inside it.
 */
export interface BilanCrumb {
  id: string;
  monthLabel: string;
  year: number;
  title: string;
}

export interface ArticleView {
  article: PublishedArticle;
  related: RelatedArticle[];
  prev?: PublishedArticle;
  next?: PublishedArticle;
  bilan?: BilanCrumb;
  comments: Comment[];
}

interface WireArticleView {
  article: WirePublishedArticle;
  related: Array<WirePublishedArticle & { note: string }>;
  prev: WirePublishedArticle | null;
  next: WirePublishedArticle | null;
  bilan: BilanCrumb | null;
  comments: WireComment[];
}

/**
 * Everything the avis page renders, in one request.
 *
 * `id` may be absent — a malformed route — in which case the hook stays idle
 * rather than asking the server about the empty string.
 */
export function useArticleView(id: string | undefined): Mapped<ArticleView> {
  // `admin: true` sends the editor's own bearer token when they're signed in,
  // so the server can tell their own visits apart from a reader's and leave
  // them out of the view count. Anonymous visitors send nothing extra.
  const query = useApi<WireArticleView>(
    id ? `/api/articles/${encodeURIComponent(id)}` : null,
    { admin: true },
  );
  return useMapped(query, (payload) => ({
    article: toPublishedArticle(payload.article),
    related: payload.related.map((item) => ({ ...toPublishedArticle(item), note: item.note })),
    prev: payload.prev ? toPublishedArticle(payload.prev) : undefined,
    next: payload.next ? toPublishedArticle(payload.next) : undefined,
    bilan: payload.bilan ?? undefined,
    comments: payload.comments.map(toComment),
  }));
}

/* -------------------------------------------------------------------------- */
/* Bilans                                                                      */
/* -------------------------------------------------------------------------- */

/** A month as the listings show it, without opening it. */
export type BilanSummary = PublishedBilan & { avisCount: number; covers: string[] };

/** Every published month, newest first. */
export function useBilanList(): Mapped<BilanSummary[]> {
  const query = useApi<{
    items: Array<WirePublishedBilan & { avisCount: number; covers: string[] }>;
  }>('/api/bilans');
  return useMapped(query, (payload) =>
    payload.items.map((item) => ({
      ...toPublishedBilan(item),
      avisCount: item.avisCount,
      covers: item.covers,
    })),
  );
}

export interface BilanView {
  bilan: PublishedBilan;
  comments: Comment[];
}

/**
 * One month and its thread.
 *
 * `id` is a month ('2026-07') or the literal `latest`, which spares the page a
 * round-trip through the list just to learn the newest id. Passing `null` keeps
 * the hook idle — that is how the page arms its fallback request without firing
 * it on every visit.
 */
export function useBilanView(id: string | null): Mapped<BilanView> {
  // Same reasoning as `useArticleView`: the editor's own reads of a bilan
  // they just published should not count as an audience view.
  const query = useApi<{ bilan: WirePublishedBilan; comments: WireComment[] }>(
    id ? `/api/bilans/${encodeURIComponent(id)}` : null,
    { admin: true },
  );
  return useMapped(query, (payload) => ({
    bilan: toPublishedBilan(payload.bilan),
    comments: payload.comments.map(toComment),
  }));
}

/* -------------------------------------------------------------------------- */
/* Pages éditoriales                                                           */
/* -------------------------------------------------------------------------- */

/** Read by the public page and by its admin editor alike — nothing here is privileged. */
export function useAPropos(): Query<AProposContent> {
  return useApi<AProposContent>('/api/pages/apropos');
}

export function useMeSuivre(): Query<MeSuivreContent> {
  return useApi<MeSuivreContent>('/api/pages/me-suivre');
}
