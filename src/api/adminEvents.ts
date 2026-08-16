/**
 * A tiny invalidation signal for the admin nav badges.
 *
 * `useApi` (see `useApi.ts`) is deliberately cache-free: every component that
 * calls `useAdminArticles`/`useAdminBilans` fetches on its own. `AdminHeader`
 * mounts once and keeps its counts for the life of the admin session, so a
 * create, publish/unpublish or delete happening on another screen would
 * otherwise leave its badge stale until a full reload. The mutations that
 * change those counts (`mutations.ts`) fire one of these after a successful
 * write; `AdminHeader` listens and reloads just its own counts.
 */

const ARTICLES_CHANGED = 'admin:articles-changed';
const BILANS_CHANGED = 'admin:bilans-changed';

export function notifyArticlesChanged(): void {
  window.dispatchEvent(new Event(ARTICLES_CHANGED));
}

export function notifyBilansChanged(): void {
  window.dispatchEvent(new Event(BILANS_CHANGED));
}

/** Returns the unsubscribe function, ready to hand to a `useEffect` cleanup. */
export function onArticlesChanged(handler: () => void): () => void {
  window.addEventListener(ARTICLES_CHANGED, handler);
  return () => window.removeEventListener(ARTICLES_CHANGED, handler);
}

export function onBilansChanged(handler: () => void): () => void {
  window.addEventListener(BILANS_CHANGED, handler);
  return () => window.removeEventListener(BILANS_CHANGED, handler);
}
