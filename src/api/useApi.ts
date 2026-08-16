/**
 * The one hook the pages use to read the API.
 *
 * Small on purpose — no cache, no retries, no stale-while-revalidate. What it
 * does carry is the three things that were wrong when data was synchronous and
 * would be wrong again if each page improvised:
 *
 *   * **Loading is not "absent".** Before this, `articleById(id)` returning
 *     nothing meant "this avis does not exist", and the page said so. Async, the
 *     same emptiness also means "not yet". `status` separates them, and a 404
 *     arrives as an `ApiError`, never as missing data.
 *   * **A stale answer never wins.** Navigating between two avis fires two
 *     requests; the slower one must not overwrite the newer. The request is
 *     aborted, and a sequence number guards the state on top of that — an abort
 *     that lands after a response would otherwise still resolve.
 *   * **`null` means "do not ask".** The header is mounted on every page but
 *     only wants an avis on `/article/:id`. Passing `null` keeps the hook
 *     inert rather than forcing a component to be conditionally rendered.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { apiGet, ApiError, type GetOptions } from './client';

export type QueryStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface Query<T> {
  data?: T;
  status: QueryStatus;
  error?: ApiError;
  /** True for the one case a page renders differently: the row is not there. */
  notFound: boolean;
  /** Refetch the current path. No-op while the path is `null`. */
  reload(): void;
}

export function useApi<T>(path: string | null, options: GetOptions = {}): Query<T> {
  const [data, setData] = useState<T>();
  const [error, setError] = useState<ApiError>();
  const [status, setStatus] = useState<QueryStatus>(path ? 'loading' : 'idle');
  const [nonce, setNonce] = useState(0);

  // Identifies the request whose answer is still wanted. Bumped on every new
  // path so a late resolution can recognise itself as obsolete.
  const current = useRef(0);
  const admin = options.admin ?? false;

  useEffect(() => {
    if (!path) {
      setStatus('idle');
      setData(undefined);
      setError(undefined);
      return;
    }

    const id = current.current + 1;
    current.current = id;
    const controller = new AbortController();

    setStatus('loading');
    setError(undefined);

    apiGet<T>(path, { admin, signal: controller.signal })
      .then((result) => {
        if (current.current !== id) return;
        setData(result);
        setStatus('ready');
      })
      .catch((cause: unknown) => {
        // An abort is this hook's own doing; reporting it as an error would
        // flash "impossible de charger" on every navigation.
        if (cause instanceof DOMException && cause.name === 'AbortError') return;
        if (current.current !== id) return;
        setError(cause instanceof ApiError ? cause : new ApiError(0, String(cause)));
        setStatus('error');
      });

    return () => controller.abort();
  }, [path, admin, nonce]);

  const reload = useCallback(() => setNonce((value) => value + 1), []);

  return {
    data,
    status,
    error,
    notFound: error?.isNotFound ?? false,
    reload,
  };
}
