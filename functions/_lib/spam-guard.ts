/**
 * The two cheapest guards on any public write with a free-text field, shared
 * by `/api/comments` and `/api/newsletter/subscribe`.
 *
 *   1. honeypot — a field no human sees, filled in by form-filling bots
 *   2. minimum delay — a form submitted faster than it can be read
 *
 * Neither is the last word (comments land 'pending', a subscribe is cheap to
 * reverse) but both answer quietly: a caller that trips either gets treated as
 * legitimate at the HTTP layer, so telling a bot which check caught it is
 * telling it what to change.
 */

/** Long enough to read the field, short enough to catch a bot. */
const MIN_SECONDS = 3;

/**
 * How long a stamp may plausibly be old. Twelve hours covers a tab left open
 * overnight; anything beyond is a fabricated stamp, not a slow reader.
 */
const MAX_AGE_MS = 12 * 60 * 60 * 1000;

/**
 * True if the submission looks automated: the honeypot is filled, or
 * `openedAt` isn't a plausible time-on-form. `Number(null)` is 0, which would
 * otherwise read as "opened at the epoch" — so the window is closed at both
 * ends, not just a lower bound.
 */
export function looksAutomated(body: Record<string, unknown>): boolean {
  if (typeof body.trap === 'string' && body.trap.trim() !== '') return true;

  const openedAt = Number(body.openedAt);
  const age = Date.now() - openedAt;
  return !Number.isFinite(openedAt) || age < MIN_SECONDS * 1000 || age > MAX_AGE_MS;
}