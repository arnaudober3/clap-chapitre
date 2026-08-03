/**
 * The write-side counterpart of `useApi`.
 *
 * `useApi` exists because "loading" and "absent" are different things. This
 * exists because "saving", "saved" and "failed to save" are three states no
 * screen could express before: the forms had a hardcoded "Brouillon enregistré ·
 * 11:42" line and nothing else, since nothing was ever actually sent.
 *
 * It keeps two guarantees from its read-side twin:
 *
 *   * **A stale answer never wins.** Clicking "Enregistrer" twice fires two
 *     writes; only the last one's outcome may set the state. Without the
 *     sequence guard, a slow first save could report success over a failed
 *     second one, and the editor would believe work was stored that was not.
 *   * **Unmounting is silent.** A save that resolves after the editor navigated
 *     away updates nothing, rather than warning about a dead component.
 *
 * There is no optimistic update and no rollback. A save either happened or it
 * did not, and showing it as done before the server agrees is exactly how the
 * editor ends up trusting a state that was never written.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from './client';

export type MutationStatus = 'idle' | 'pending' | 'done' | 'error';

export interface Mutation<Args extends unknown[], Result> {
  /**
   * Runs the write. Resolves with the result, or `undefined` when it failed —
   * so a caller can navigate on success without a second try/catch. The error
   * itself is on `error`.
   */
  run(...args: Args): Promise<Result | undefined>;
  status: MutationStatus;
  /** True while in flight — what disables the primary button. */
  pending: boolean;
  error?: ApiError;
  /** Clears a previous outcome. The forms call it on the first keystroke. */
  reset(): void;
}

export function useMutation<Args extends unknown[], Result>(
  write: (...args: Args) => Promise<Result>,
): Mutation<Args, Result> {
  const [status, setStatus] = useState<MutationStatus>('idle');
  const [error, setError] = useState<ApiError>();

  // Identifies the write whose outcome is still wanted, exactly as `useApi`
  // does for reads.
  const current = useRef(0);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // Held in a ref so `run` keeps a stable identity: the forms pass it straight
  // to onClick, and a new function every render would defeat any memoisation
  // downstream.
  const latest = useRef(write);
  latest.current = write;

  const run = useCallback(async (...args: Args): Promise<Result | undefined> => {
    const id = current.current + 1;
    current.current = id;

    setStatus('pending');
    setError(undefined);

    try {
      const result = await latest.current(...args);
      if (!mounted.current || current.current !== id) return result;
      setStatus('done');
      return result;
    } catch (cause: unknown) {
      if (!mounted.current || current.current !== id) return undefined;
      setError(cause instanceof ApiError ? cause : new ApiError(0, String(cause)));
      setStatus('error');
      return undefined;
    }
  }, []);

  const reset = useCallback(() => {
    // Bumped too, so an in-flight write cannot land on a state the editor has
    // already moved past by typing again.
    current.current += 1;
    setStatus('idle');
    setError(undefined);
  }, []);

  return { run, status, pending: status === 'pending', error, reset };
}
