/**
 * The ♡, everywhere it appears.
 *
 * Two pieces of state that have to agree: the count, which is the server's, and
 * whether *this* visitor is in it, which the server also knows — it dedupes on a
 * hashed address. The hook hydrates "liked" by checking the server on mount,
 * then updates both on every toggle.
 *
 * The count is taken from the response rather than incremented locally. The
 * endpoint recomputes it from the `likes` table on every toggle, so a second
 * click, a stale tab or a retry all converge on the same number instead of
 * drifting one apart each time.
 */
import { useEffect, useState } from 'react';
import { toggleLike } from './mutations';

export interface Like {
  likes: number;
  liked: boolean;
  pending: boolean;
  toggle(): void;
}

export function useLike(
  targetType: 'article' | 'bilan' | 'comment',
  targetId: string,
  initial: number,
): Like {
  const [likes, setLikes] = useState(initial);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!targetId) return;
    // Check the server on mount to hydrate the initial liked state.
    void fetch(`/api/likes?targetType=${encodeURIComponent(targetType)}&targetId=${encodeURIComponent(targetId)}`)
      .then((res) => res.json() as Promise<{ liked: boolean }>)
      .then((data) => setLiked(data.liked))
      .catch(() => {
        // If the check fails, leave liked as false — better than a stale UI.
      });
  }, [targetType, targetId]);

  function toggle() {
    // Guarded rather than queued: a double click is one intent, and letting the
    // second request race the first would show whichever answered last.
    if (pending || !targetId) return;
    setPending(true);
    void toggleLike(targetType, targetId)
      .then((result) => {
        setLikes(result.likes);
        setLiked(result.liked);
      })
      // Left untouched on failure. Showing a heart that did not register is the
      // one outcome worse than a heart that did not move.
      .catch(() => undefined)
      .finally(() => setPending(false));
  }

  return { likes, liked, pending, toggle };
}
