/**
 * Europe/Paris wall-clock time → the UTC instant `newsletter_sends.scheduled_at`
 * stores.
 *
 * The editor types "9h" meaning 9h in Paris, not in UTC — and Paris shifts
 * between UTC+1 and UTC+2 on the last Sundays of March and October. There is
 * no hand-rolled DST table here: the Workers runtime ships full ICU, so the
 * offset for a given date is read from `Intl.DateTimeFormat` itself rather
 * than reimplemented.
 */

/**
 * `('2026-07-03', '09:00')` → `'2026-07-03 07:00:00'` (UTC+2 in July).
 *
 * Two passes. The first treats the wall-clock digits as if they were already
 * UTC — call that the guess. Formatting the guess back through the
 * `Europe/Paris` time zone reveals how far that zone actually sits from UTC
 * at that date; subtracting the difference turns the guess into the real
 * instant. One pass is enough because the offset does not depend on which
 * instant within a given calendar day is being converted, only on the date.
 */
export function parisToUtcInstant(date: string, time: string): string {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);

  const guess = Date.UTC(year, month - 1, day, hour, minute, 0);

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Paris',
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(guess));

  const part = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? '0');
  const parisReading = Date.UTC(
    part('year'),
    part('month') - 1,
    part('day'),
    part('hour'),
    part('minute'),
    part('second'),
  );

  const offsetMs = parisReading - guess;
  return new Date(guess - offsetMs).toISOString().replace('T', ' ').slice(0, 19);
}
