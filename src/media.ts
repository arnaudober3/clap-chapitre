import type { Medium } from './mock/types';

/**
 * The four media, each with its URL segment (matching the home routes
 * /films·/series·/livres·/docs and the /archives/<segment> avis archive), its
 * plural display label, its singular one and its accent color token. Single
 * source of truth for medium ↔ route ↔ presentation mapping.
 */
export const MEDIA: Array<{
  medium: Medium;
  segment: string;
  label: string;
  /** Singular display label ("Film") — feeds read plural, an avis reads singular. */
  one: string;
  /** Admin chip label. Same as `one` except docs, which stay plural on chips. */
  chip: string;
  /** The medium's accent color token. Note the doc token is plural. */
  accent: string;
}> = [
  { medium: 'film', segment: 'films', label: 'Films', one: 'Film', chip: 'Film', accent: 'var(--medium-film)' },
  { medium: 'serie', segment: 'series', label: 'Séries', one: 'Série', chip: 'Série', accent: 'var(--medium-serie)' },
  { medium: 'livre', segment: 'livres', label: 'Livres', one: 'Livre', chip: 'Livre', accent: 'var(--medium-livre)' },
  { medium: 'doc', segment: 'docs', label: 'Docs', one: 'Doc', chip: 'Docs', accent: 'var(--medium-docs)' },
];

/** Resolve a URL segment (e.g. 'films') to its Medium, or undefined if unknown. */
export const SEGMENT_TO_MEDIUM: Record<string, Medium> = Object.fromEntries(
  MEDIA.map((m) => [m.segment, m.medium]),
);

/** Resolve a Medium to its URL segment (e.g. 'film' → 'films'). */
export const MEDIUM_TO_SEGMENT = Object.fromEntries(
  MEDIA.map((m) => [m.medium, m.segment]),
) as Record<Medium, string>;

/** The default medium segment used when none is specified. */
export const DEFAULT_SEGMENT = MEDIA[0].segment;

/** Singular display label ('film' → 'Film') — hero eyebrows and card labels. */
export const MEDIUM_LABEL = Object.fromEntries(
  MEDIA.map((m) => [m.medium, m.one]),
) as Record<Medium, string>;

/**
 * The admin variant of the singular label ('doc' → 'Docs'). The back-office
 * chips read the category, not one work, so docs keep their plural there.
 */
export const MEDIUM_CHIP_LABEL = Object.fromEntries(
  MEDIA.map((m) => [m.medium, m.chip]),
) as Record<Medium, string>;

/** Medium → its accent color token, ready to drop in a `style` value. */
export const MEDIUM_ACCENT = Object.fromEntries(
  MEDIA.map((m) => [m.medium, m.accent]),
) as Record<Medium, string>;