/**
 * Client-side input checks shared across forms. Kept deliberately loose: the
 * server is the authority (`functions/_lib/body.ts`'s `email()` reader), this
 * only catches an obvious typo before a request goes out.
 */

/** Something before an @, something after, and a dot in the domain. */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
