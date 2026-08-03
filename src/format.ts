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

/**
 * The narrow no-break space and the no-break space fr-FR uses as separators.
 * Written as escapes on purpose: spelled literally they are indistinguishable
 * from a plain space in the source, and an editor that folds them silently
 * turns the normalisation below into a no-op.
 */
const NBSP = /[\u202f\u00a0]/g;

/** French thousands grouping with a plain space ("8940" → "8 940"). */
export function frNumber(value: number): string {
  // fr-FR grouping uses narrow/no-break spaces; normalize to a plain space so
  // markup and tests stay predictable.
  return value.toLocaleString('fr-FR').replace(NBSP, ' ');
}

/** French month name from its 1–12 number, capitalised ("Août"). */
export function monthName(month: number): string {
  // Any year works — only the month part is read.
  const label = new Date(2000, month - 1, 1).toLocaleDateString('fr-FR', { month: 'long' });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/**
 * A signed figure with French grouping ("38" → "+38", "-1284" → "-1 284"). A
 * gain has to wear its plus sign to read as a movement rather than a total; a
 * loss already carries its own minus, and zero stays bare.
 */
export function signedNumber(value: number): string {
  return value > 0 ? `+${frNumber(value)}` : frNumber(value);
}

/**
 * A French month name turned into its "de …" complement, elided before a vowel
 * ("Juin" → "de juin", "Août" → "d’août"). Only avril, août and octobre start
 * with a vowel, but the test is written on the letter so it never has to be
 * revisited.
 */
export function ofMonth(monthLabel: string): string {
  const lower = monthLabel.toLowerCase();
  // The month names are known ASCII-vowel starters; fold anyway so an accented
  // first letter would still be caught.
  return /^[aeiouy]/.test(fold(lower)) ? `d’${lower}` : `de ${lower}`;
}

/**
 * Long French date from a sortable ISO day ("2026-07-18" → "18 juillet 2026").
 *
 * The counterpart of `shortDate`, for the places that read as prose rather than
 * as a table: an avis header, a comment. Same manual parsing, for the same
 * reason — `new Date('2026-07-18')` is UTC midnight, which is the day before in
 * any negative offset.
 *
 * An absent or malformed value renders as the empty string, not as a dash: a
 * draft has no publication date, and the layout expects nothing there, not a
 * placeholder.
 */
export function longDate(iso?: string): string {
  const parts = iso?.split('-');
  if (!parts || parts.length !== 3) return '';
  const [year, month, day] = parts.map(Number);
  if (!year || !month || !day) return '';
  return new Date(year, month - 1, day)
    .toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
    .replace(NBSP, ' ');
}

/**
 * How long ago something was edited, as the drafts listing says it
 * ("Modifié il y a 2 jours").
 *
 * `now` is a parameter rather than a call to `Date.now()` inside: a test that
 * cannot pin the clock can only assert that *something* was rendered, and this
 * string is the whole content of a column.
 *
 * Days are counted on calendar days, not on 24-hour blocks — something edited at
 * 23:00 reads "hier" at 07:00 the next morning, which is what a reader means.
 */
export function editedLabel(iso?: string, now: number = Date.now()): string {
  if (!iso) return '';
  const edited = new Date(iso.replace(' ', 'T') + (iso.includes('Z') ? '' : 'Z'));
  if (Number.isNaN(edited.getTime())) return '';

  const startOfDay = (time: number) => {
    const date = new Date(time);
    return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  };
  const days = Math.round((startOfDay(now) - startOfDay(edited.getTime())) / 86_400_000);

  if (days <= 0) return "Modifié aujourd'hui";
  if (days === 1) return 'Modifié hier';
  return `Modifié il y a ${days} jours`;
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
    .replace(NBSP, ' ');
}
