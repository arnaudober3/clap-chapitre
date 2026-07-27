/**
 * Admin dashboard mock content. Static, deterministic French analytics data for
 * the "Espace admin" tableau de bord. No network, no real analytics. Selectors
 * are pure functions (no React, no module-level mutable state), mirroring the
 * discipline of home.ts / bilans.ts.
 */

/** A leaderboard row's kind — the four media plus the "bilan" publication type. */
export type LeaderboardKind = 'bilan' | 'film' | 'serie' | 'livre' | 'doc';

/** One headline KPI (Vues / Likes / Commentaires / Partages). */
export interface KpiStat {
  key: string;
  label: string;
  value: number;
  /** Signed percentage change over the period (positive = up). */
  deltaPct: number;
}

/** A selectable reporting period for the dashboard header. */
export interface Period {
  id: string;
  label: string;
}

/** A publication in the "Palmarès" leaderboard. */
export interface LeaderboardEntry {
  id: string;
  kind: LeaderboardKind;
  /** Display label for the kind chip, e.g. "Film", "Bilan". */
  kindLabel: string;
  title: string;
  views: number;
  /** Optional link to a real article id — reserved for future wiring, unused. */
  articleId?: string;
}

/** A leaderboard entry with its bar ratio (views / max views), 0..1. */
export interface RankedEntry extends LeaderboardEntry {
  ratio: number;
}

/** One month of the views trend sparkline. */
export interface TrendPoint {
  month: string;
  views: number;
}

/** An unfinished draft in the "À terminer" card. */
export interface Draft {
  id: string;
  title: string;
  /** Status label, e.g. "Brouillon". */
  kindLabel: string;
}

/** The newsletter edition awaiting send. */
export interface NewsletterStatus {
  edition: string;
  subscribers: number;
  ready: boolean;
}

/** The default reporting window — the "ce mois-ci" figures of the design. */
export const DEFAULT_PERIOD = '30j';

const PERIODS: Period[] = [
  { id: '7j', label: '7 derniers jours' },
  { id: '30j', label: '30 derniers jours' },
  { id: '12m', label: '12 derniers mois' },
];

/**
 * KPI figures per reporting window. The 30-day window carries the design values
 * (all "↑"); the shorter/longer windows vary the figures and include a couple of
 * negative deltas (a metric that dipped vs. the previous window) so the "↓" state
 * is exercised by real data.
 */
const KPIS_BY_PERIOD: Record<string, KpiStat[]> = {
  '7j': [
    { key: 'views', label: 'Vues', value: 2180, deltaPct: 6 },
    { key: 'likes', label: 'Likes', value: 74, deltaPct: -4 },
    { key: 'comments', label: 'Commentaires', value: 11, deltaPct: 3 },
    { key: 'shares', label: 'Partages', value: 24, deltaPct: 8 },
  ],
  '30j': [
    { key: 'views', label: 'Vues', value: 8940, deltaPct: 18 },
    { key: 'likes', label: 'Likes', value: 314, deltaPct: 9 },
    { key: 'comments', label: 'Commentaires', value: 46, deltaPct: 12 },
    { key: 'shares', label: 'Partages', value: 105, deltaPct: 23 },
  ],
  '12m': [
    { key: 'views', label: 'Vues', value: 76400, deltaPct: 41 },
    { key: 'likes', label: 'Likes', value: 2680, deltaPct: 27 },
    { key: 'comments', label: 'Commentaires', value: 392, deltaPct: -6 },
    { key: 'shares', label: 'Partages', value: 910, deltaPct: 34 },
  ],
};

const LEADERBOARD: LeaderboardEntry[] = [
  { id: 'bilan-ete', kind: 'bilan', kindLabel: 'Bilan', title: 'Le bilan de l’été', views: 3420 },
  {
    id: 'un-dernier-ete',
    kind: 'film',
    kindLabel: 'Film',
    title: 'Un dernier été',
    views: 2180,
    articleId: 'un-dernier-ete',
  },
  {
    id: 'les-nuits-blanches',
    kind: 'serie',
    kindLabel: 'Série',
    title: 'Les nuits blanches',
    views: 1640,
    articleId: 'les-nuits-blanches',
  },
  {
    id: 'l-annee-de-la-pluie',
    kind: 'livre',
    kindLabel: 'Livre',
    title: 'L’année de la pluie',
    views: 1210,
    articleId: 'l-annee-de-la-pluie',
  },
  {
    id: 'fragments',
    kind: 'doc',
    kindLabel: 'Docs',
    title: 'Fragments',
    views: 870,
    articleId: 'fragments',
  },
];

/** 12 months of views, peaking in août (design 6b / 6h sparkline). */
const TREND: TrendPoint[] = [
  { month: 'sep', views: 4200 },
  { month: 'oct', views: 4600 },
  { month: 'nov', views: 4400 },
  { month: 'déc', views: 5200 },
  { month: 'jan', views: 5600 },
  { month: 'fév', views: 5300 },
  { month: 'mar', views: 6200 },
  { month: 'avr', views: 5900 },
  { month: 'mai', views: 6800 },
  { month: 'juin', views: 7200 },
  { month: 'juil', views: 8100 },
  { month: 'août', views: 8940 },
];

const DRAFTS: Draft[] = [
  { id: 'bilan-septembre', title: 'Bilan de septembre', kindLabel: 'Brouillon' },
  { id: 'fragments', title: 'Fragments', kindLabel: 'Brouillon' },
];

const NEWSLETTER: NewsletterStatus = {
  edition: 'Newsletter d’août',
  subscribers: 1284,
  ready: true,
};

/** The selectable reporting periods for the header dropdown. */
export function periods(): Period[] {
  return PERIODS;
}

/**
 * The four headline KPIs for the given reporting window, defaulting to the design
 * window. An unknown period id falls back to the default rather than throwing.
 */
export function kpis(period: string = DEFAULT_PERIOD): KpiStat[] {
  return KPIS_BY_PERIOD[period] ?? KPIS_BY_PERIOD[DEFAULT_PERIOD];
}

/**
 * The leaderboard sorted by views desc, each carrying its bar `ratio` relative
 * to the top entry — so the design's 100/64/48/35/25 % bars fall out of the data
 * rather than being hardcoded.
 */
export function leaderboardRanked(): RankedEntry[] {
  const sorted = [...LEADERBOARD].sort((a, b) => b.views - a.views);
  const max = sorted[0]?.views ?? 1;
  return sorted.map((entry) => ({ ...entry, ratio: entry.views / max }));
}

/** The 12-month views trend for the sparkline. */
export function trend(): TrendPoint[] {
  return TREND;
}

/** The peak month of the trend (for the "pic en août" subtitle). */
export function trendPeak(): TrendPoint {
  return TREND.reduce((peak, point) => (point.views > peak.views ? point : peak), TREND[0]);
}

/** The drafts awaiting completion. */
export function drafts(): Draft[] {
  return DRAFTS;
}

/** The newsletter edition awaiting send. */
export function newsletter(): NewsletterStatus {
  return NEWSLETTER;
}
