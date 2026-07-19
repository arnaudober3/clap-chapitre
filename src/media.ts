import type { Medium } from './mock/types';

/**
 * The four media, each with its URL segment (matching the home routes
 * /films·/series·/livres·/docs and the /archives/<segment> avis archive) and
 * its plural display label. Single source of truth for medium ↔ route mapping.
 */
export const MEDIA: Array<{ medium: Medium; segment: string; label: string }> = [
  { medium: 'film', segment: 'films', label: 'Films' },
  { medium: 'serie', segment: 'series', label: 'Séries' },
  { medium: 'livre', segment: 'livres', label: 'Livres' },
  { medium: 'doc', segment: 'docs', label: 'Docs' },
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