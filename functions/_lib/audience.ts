/**
 * Small shared pieces for the real audience measurements: view/share
 * recording and the admin dashboard's period math.
 */

/**
 * A heuristic, not a registry. Catches the common crawlers by their own
 * User-Agent conventions (`bot`, `spider`, `crawl`…) plus the named
 * social-preview fetchers `functions/_middleware.ts` already lists — several
 * of them (`facebookexternalhit`, `Slackbot`'s ImgProxy variant) carry no
 * "bot" substring of their own. Misses anything that disguises itself — same
 * known-gap shape as the login endpoint's throttle-only rate limiting.
 */
const CRAWLER_UA = /bot|spider|crawl|slurp|preview|monitor|facebookexternalhit|whatsapp/i;

export function isCrawler(userAgent: string | null): boolean {
  return !!userAgent && CRAWLER_UA.test(userAgent);
}

/** The dashboard's three reporting periods, and how many days each spans. */
export const WINDOWS = {
  '7j': 7,
  '30j': 30,
  '12m': 365,
} as const;

export type Period = keyof typeof WINDOWS;

export function isPeriod(value: string): value is Period {
  return value in WINDOWS;
}

/**
 * Variation against the immediately preceding window of equal length, in
 * whole percentage points. A previous window of zero has no ratio — treated
 * as +100% if something happened at all, 0% if nothing did on either side,
 * rather than an undefined or infinite jump.
 */
export function deltaPct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/**
 * French month abbreviations, in the exact short form the dashboard has
 * always used (`stat_trend.month_label` before it was computed). Duplicated
 * rather than imported from `src/format.ts` — `functions/_lib` stays
 * independent of `src/`, the same tradeoff already made for base64url.
 */
const MONTH_ABBREV = [
  'jan',
  'fév',
  'mar',
  'avr',
  'mai',
  'juin',
  'juil',
  'août',
  'sep',
  'oct',
  'nov',
  'déc',
];

/** `'2026-07'` → `'juil'`. */
export function monthAbbrev(yearMonth: string): string {
  const month = Number(yearMonth.slice(5, 7));
  return MONTH_ABBREV[month - 1] ?? '';
}

/**
 * The last `count` calendar months, oldest first, as `'AAAA-MM'` keys —
 * including the current one. Used to walk a continuous trend series even for
 * months `view_hits` has no row for.
 */
export function lastMonths(count: number, from = new Date()): string[] {
  const months: string[] = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const d = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - offset, 1));
    months.push(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`);
  }
  return months;
}
