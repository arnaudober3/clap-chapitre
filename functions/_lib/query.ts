/**
 * Reading query parameters, strictly.
 *
 * The rule here: an absent parameter takes its default, an *invalid* one is a
 * 400. Silently falling back — `?medium=flim` quietly becoming "all media" —
 * would make a typo look like a working request returning the wrong page, which
 * is the hardest kind of bug to notice from the outside.
 *
 * Every reader throws `QueryError` and the handlers turn it into `badRequest()`,
 * so an endpoint never has to remember which of its parameters can fail.
 */
import { fold } from './text';
import { isArticleSort, isBilanSort, type ArticleSort, type BilanSort } from './sql';
import type { Medium } from '../../shared/content';

export class QueryError extends Error {
  constructor(readonly parameter: string) {
    super(`Paramètre invalide : ${parameter}.`);
    this.name = 'QueryError';
  }
}

/** Exported since the write paths validate the same four values from a body. */
export const MEDIA: readonly Medium[] = ['film', 'serie', 'livre', 'doc'];
const STATUSES = ['published', 'draft'] as const;

export type StatusFilter = (typeof STATUSES)[number];

/** `?medium=film`. Absent means every medium — the mixed feed. */
export function readMedium(url: URL): Medium | undefined {
  const raw = url.searchParams.get('medium');
  if (raw === null || raw === '') return undefined;
  if (!MEDIA.includes(raw as Medium)) throw new QueryError('medium');
  return raw as Medium;
}

/** `?status=draft`. Absent means both, which only admin routes ever allow. */
export function readStatus(url: URL): StatusFilter | undefined {
  const raw = url.searchParams.get('status');
  if (raw === null || raw === '' || raw === 'all') return undefined;
  if (!STATUSES.includes(raw as StatusFilter)) throw new QueryError('status');
  return raw as StatusFilter;
}

export function readArticleSort(url: URL): ArticleSort {
  const raw = url.searchParams.get('sort');
  if (raw === null || raw === '') return 'recent';
  if (!isArticleSort(raw)) throw new QueryError('sort');
  return raw;
}

export function readBilanSort(url: URL): BilanSort {
  const raw = url.searchParams.get('sort');
  if (raw === null || raw === '') return 'recent';
  if (!isBilanSort(raw)) throw new QueryError('sort');
  return raw;
}

/**
 * `?search=été`, folded here so the comparison happens on equal terms with the
 * folded column. An empty or whitespace-only term means "no filter" rather than
 * "match everything with %%": same result, one less scan.
 */
export function readSearch(url: URL): string | undefined {
  const raw = url.searchParams.get('search');
  if (raw === null) return undefined;
  const trimmed = raw.trim();
  return trimmed ? fold(trimmed) : undefined;
}

/** `?page=2`, 1-based. Page 0 and page -1 are mistakes, not page 1. */
export function readPage(url: URL): number {
  return readPositiveInt(url, 'page', 1, Number.MAX_SAFE_INTEGER);
}

/**
 * `?perPage=7`. Capped, because the ceiling is the only thing standing between
 * a public endpoint and `?perPage=1000000`.
 */
export function readPerPage(url: URL, fallback: number, max: number): number {
  return readPositiveInt(url, 'perPage', fallback, max);
}

/** `?limit=7`, the feed's own name for the same idea. */
export function readLimit(url: URL, fallback: number, max: number): number {
  return readPositiveInt(url, 'limit', fallback, max);
}

function readPositiveInt(url: URL, name: string, fallback: number, max: number): number {
  const raw = url.searchParams.get(name);
  if (raw === null || raw === '') return fallback;
  // `Number` rather than `parseInt`: parseInt('7abc') is 7, which would accept a
  // parameter nobody meant to send.
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > max) throw new QueryError(name);
  return value;
}
