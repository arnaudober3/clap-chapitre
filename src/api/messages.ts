/**
 * The French wording shown when a request fails.
 *
 * Gathered here because `src/auth/auth.ts` and `src/api/client.ts` both say
 * "server unreachable" to the same reader, and two copies of a sentence drift
 * into two slightly different sentences.
 */

/** Shown when `fetch` itself fails — offline, DNS, dev server down. */
export const NETWORK_ERROR = 'Serveur injoignable. Réessaie dans un instant.';

/** Fallback when the server answers an error without a usable body. */
export const SERVER_ERROR = 'Une erreur est survenue. Réessaie dans un instant.';

/** What a page shows in place of content it could not load. */
export const CONTENT_ERROR = 'Ce contenu n’a pas pu être chargé.';
