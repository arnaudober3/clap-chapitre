/**
 * The vocabulary of a back-office listing query: what the toolbars offer, and
 * the object a page threads through its state.
 *
 * This is UI vocabulary, not data — which is why it survived the move to the
 * database while the selectors around it did not. The filtering itself now
 * happens in SQL, at the endpoint; what stays here is the list of choices the
 * editor can make and their French labels.
 */
import type { Medium } from '../../shared/content';
import { MEDIA } from '../media';

/** Which publication states a listing shows. */
export type StatusFilter = 'all' | 'published' | 'draft';

/** A medium filter, or every medium at once. */
export type MediumFilter = Medium | 'all';

/** The listing sort orders. Shared by both listings — they offer the same three. */
export type SortId = 'recent' | 'oldest' | 'views';

/** The avis listing query — one object so pages thread a single piece of state. */
export interface ArticleQuery {
  status: StatusFilter;
  medium: MediumFilter;
  search: string;
  sort: SortId;
}

/** The bilans listing query. No status: the month in progress has its own card. */
export interface BilanQuery {
  search: string;
  sort: SortId;
}

/** The listing's starting query: everything, newest first. */
export const DEFAULT_QUERY: ArticleQuery = {
  status: 'all',
  medium: 'all',
  search: '',
  sort: 'recent',
};

export const DEFAULT_BILAN_QUERY: BilanQuery = {
  search: '',
  sort: 'recent',
};

/** The status segmented control. */
export function statusFilters(): Array<{ id: StatusFilter; label: string }> {
  return [
    { id: 'all', label: 'Tous' },
    { id: 'published', label: 'Publiés' },
    { id: 'draft', label: 'Brouillons' },
  ];
}

/** The medium dropdown — derived from MEDIA so route/label stay single-sourced. */
export function mediumFilters(): Array<{ id: MediumFilter; label: string }> {
  return [
    { id: 'all', label: 'Tous les médiums' },
    ...MEDIA.map((entry) => ({ id: entry.medium as MediumFilter, label: entry.label })),
  ];
}

/** The sort dropdown. */
export function sortOptions(): Array<{ id: SortId; label: string }> {
  return [
    { id: 'recent', label: 'Plus récents' },
    { id: 'oldest', label: 'Plus anciens' },
    { id: 'views', label: 'Plus vus' },
  ];
}

/** The bilans listing offers the same three orders. */
export const bilanSortOptions = sortOptions;

/**
 * Kept as an alias rather than folded into `SortId` at the call sites: the two
 * listings happen to offer the same orders today, and naming them separately is
 * what lets one of them gain a fourth without touching the other.
 */
export type BilanSortId = SortId;
