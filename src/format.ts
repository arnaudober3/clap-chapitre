/**
 * Shared French display formatting. Pure functions — no React, no I/O. Lives
 * next to `media.ts` because both the admin dashboard and the admin article
 * listing format the same figures and dates.
 */

/**
 * Lowercased and stripped of diacritics, so "ete" matches "été". Shared by the
 * admin listings' title search.
 */
export function fold(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/** French thousands grouping with a plain space ("8940" → "8 940"). */
export function frNumber(value: number): string {
  // fr-FR grouping uses narrow/no-break spaces (U+202F / U+00A0); normalize to a
  // plain space so markup and tests stay predictable.
  return value.toLocaleString('fr-FR').replace(/[  ]/g, ' ');
}

/**
 * Short French date from a sortable ISO day ("2026-07-12" → "12 juil. 2026").
 * The parts are parsed by hand and rebuilt as a local date so the result never
 * shifts a day depending on the runner's timezone. An absent/malformed value
 * renders the em dash the admin listing uses for "not published yet".
 */
export function shortDate(iso?: string): string {
  const parts = iso?.split('-');
  if (!parts || parts.length !== 3) return '—';
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return '—';
  return new Date(year, month - 1, day)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
    .replace(/[  ]/g, ' ');
}
