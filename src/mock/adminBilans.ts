/**
 * The admin bilan catalogue — every monthly bilan Marie-Zoé has written,
 * published or not. It is the same `Bilan` model the public site renders: the
 * months exposed by `bilans.ts` are literally the ones listed here (same ids),
 * and this module only adds what the public bilan pages never showed — the
 * older months, kept as headline + figures without their detailed avis, and the
 * month currently being written.
 *
 * Static French mock content, no network. Selectors are pure functions (no
 * React, no module-level mutable state), mirroring adminArticles.ts.
 */
import type { DraftBilan, PublishedBilan } from './types';
import { bilans } from './bilans';
import { fold } from '../format';

/** The listing sort orders. */
export type BilanSortId = 'recent' | 'oldest' | 'views';

/** The full listing query — one object so the page threads a single state. */
export interface BilanQuery {
  search: string;
  sort: BilanSortId;
}

/** Rows per listing page — the design shows "7 bilans sur 14". */
export const PAGE_SIZE = 7;

/** The listing's starting query: everything, newest first. */
export const DEFAULT_QUERY: BilanQuery = {
  search: '',
  sort: 'recent',
};

/**
 * The months that predate the public bilan pages. They carry the headline, the
 * per-medium tally and the audience the listing shows, but no detailed `avis` —
 * only the months `bilans.ts` exposes render a full page.
 */
const OLDER_PUBLISHED: PublishedBilan[] = [
  {
    id: '2026-03',
    year: 2026,
    month: 3,
    monthLabel: 'Mars',
    title: 'Mars 2026 — la saison des salles vides',
    mood: 'Trois séances seule, et c’était bien.',
    avis: [],
    counts: { film: 6, livre: 2 },
    views: 1880,
    likes: 76,
    status: 'published',
    publishedAt: '2026-04-01',
  },
  {
    id: '2026-02',
    year: 2026,
    month: 2,
    monthLabel: 'Février',
    title: 'Février 2026 — le mois le plus court, les films les plus longs',
    mood: 'Quatre heures de projection un dimanche, sans regret.',
    avis: [],
    counts: { film: 3, serie: 2, doc: 1 },
    views: 1640,
    likes: 71,
    status: 'published',
    publishedAt: '2026-03-02',
  },
  {
    id: '2026-01',
    year: 2026,
    month: 1,
    monthLabel: 'Janvier',
    title: 'Janvier 2026 — les bonnes résolutions de lecture',
    mood: 'On avait promis un livre par semaine. On en a tenu trois.',
    avis: [],
    counts: { livre: 4, serie: 2 },
    views: 2050,
    likes: 84,
    status: 'published',
    publishedAt: '2026-02-02',
  },
  {
    id: '2025-10',
    year: 2025,
    month: 10,
    monthLabel: 'Octobre',
    title: 'Octobre 2025 — tout ce qui fait peur',
    mood: 'Un mois d’épouvante assumée, fenêtres fermées.',
    avis: [],
    counts: { film: 5, serie: 3 },
    views: 2480,
    likes: 103,
    status: 'published',
    publishedAt: '2025-11-03',
  },
  {
    id: '2025-09',
    year: 2025,
    month: 9,
    monthLabel: 'Septembre',
    title: 'Septembre 2025 — la rentrée en retard',
    mood: 'On a repris le rythme la dernière semaine, comme toujours.',
    avis: [],
    counts: { livre: 3, doc: 2, film: 1 },
    views: 1720,
    likes: 69,
    status: 'published',
    publishedAt: '2025-10-01',
  },
  {
    id: '2025-08',
    year: 2025,
    month: 8,
    monthLabel: 'Août',
    title: 'Août 2025 — lire à l’ombre',
    mood: 'Six livres, deux transats, aucun écran.',
    avis: [],
    counts: { livre: 6 },
    views: 1410,
    likes: 58,
    status: 'published',
    publishedAt: '2025-09-01',
  },
  {
    id: '2025-07',
    year: 2025,
    month: 7,
    monthLabel: 'Juillet',
    title: 'Juillet 2025 — plein soleil, salle obscure',
    mood: 'La climatisation du cinéma valait bien le prix de la place.',
    avis: [],
    counts: { film: 4, serie: 2, livre: 1 },
    views: 1290,
    likes: 52,
    status: 'published',
    publishedAt: '2025-08-01',
  },
  {
    id: '2025-06',
    year: 2025,
    month: 6,
    monthLabel: 'Juin',
    title: 'Juin 2025 — les séries qu’on regarde à deux',
    mood: 'On a fini trois saisons sans jamais avancer seule.',
    avis: [],
    counts: { serie: 4, doc: 1 },
    views: 980,
    likes: 41,
    status: 'published',
    publishedAt: '2025-07-02',
  },
  {
    id: '2025-05',
    year: 2025,
    month: 5,
    monthLabel: 'Mai',
    title: 'Mai 2025 — le tout premier bilan',
    mood: 'On ne savait pas encore que ça deviendrait un rendez-vous.',
    avis: [],
    counts: { film: 2, livre: 2 },
    views: 640,
    likes: 27,
    status: 'published',
    publishedAt: '2025-06-02',
  },
];

/**
 * The month being written. A draft has no `publishedAt` and no audience yet —
 * the page shows its `updatedLabel` and a "Reprendre" call to action instead of
 * listing it among the published months.
 */
const CURRENT_DRAFT: DraftBilan = {
  id: '2026-07',
  year: 2026,
  month: 7,
  monthLabel: 'Juillet',
  title: 'Juillet 2026 — un mois à contre-courant',
  mood: 'L’humeur du mois : lente, un peu têtue, et très bien accompagnée.',
  avis: [],
  counts: { film: 3, serie: 2, livre: 2 },
  views: 0,
  likes: 0,
  status: 'draft',
  updatedLabel: 'modifié il y a 2 jours',
};

/**
 * Every published month, newest-first. The public `bilans` and the archive
 * months never overlap, so an id appears exactly once.
 */
const CATALOGUE: PublishedBilan[] = [...bilans, ...OLDER_PUBLISHED].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);

/** Every published bilan, newest-first. */
export function adminBilans(): PublishedBilan[] {
  return CATALOGUE;
}

/** The month currently being written, if there is one. */
export function currentDraftBilan(): DraftBilan | undefined {
  return CURRENT_DRAFT;
}

/** Resolve a bilan by its 'YYYY-MM' id across the whole catalogue. */
export function adminBilanById(id: string): PublishedBilan | DraftBilan | undefined {
  if (!id) return undefined;
  if (CURRENT_DRAFT.id === id) return CURRENT_DRAFT;
  return CATALOGUE.find((bilan) => bilan.id === id);
}

/**
 * Catalogue totals for the page headers: "14 bilans publiés · depuis mai 2025"
 * on desktop, "14 publiés · 1 en cours" in the mobile top bar.
 */
export function adminBilanCounts(): { published: number; drafts: number; sinceLabel: string } {
  const oldest = CATALOGUE[CATALOGUE.length - 1];
  return {
    published: CATALOGUE.length,
    // A bilan is monthly, so there is at most one month in progress at a time.
    drafts: 1,
    sinceLabel: oldest ? `${oldest.monthLabel.toLowerCase()} ${oldest.year}` : '—',
  };
}

/** The sort dropdown. */
export function bilanSortOptions(): Array<{ id: BilanSortId; label: string }> {
  return [
    { id: 'recent', label: 'Plus récents' },
    { id: 'oldest', label: 'Plus anciens' },
    { id: 'views', label: 'Plus vus' },
  ];
}

/**
 * The published months narrowed by a title search, then sorted. The draft is
 * never part of the result: the page gives it its own card above the listing.
 */
export function filterAdminBilans(query: BilanQuery): PublishedBilan[] {
  const needle = fold(query.search.trim());
  const matching = CATALOGUE.filter(
    (bilan) => !needle || fold(bilan.title).includes(needle),
  );

  return [...matching].sort((a, b) => {
    if (query.sort === 'views') return b.views - a.views;
    return query.sort === 'oldest'
      ? a.publishedAt.localeCompare(b.publishedAt)
      : b.publishedAt.localeCompare(a.publishedAt);
  });
}
