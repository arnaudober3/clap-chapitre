/**
 * Page-local static comment thread for the single-avis page (design 4a). It
 * mirrors the shape of the Bilan culturel thread — the shared `Comment` type
 * plus a like count and one optional nested reply — but is deliberately kept
 * page-local: the Bilan components are imported by path by their own tests and
 * are not refactored here.
 *
 * Presentational mock only: no backend, no persistence, no validation.
 */
import type { Comment } from '../../mock/types';

/** A thread entry with an optional single nested reply. */
export interface ThreadEntry extends Comment {
  /** ♡ like count on this entry (presentational). */
  likes: number;
  /** A single nested reply, when present. */
  reply?: ThreadEntry;
}

/**
 * The design 4a thread: Camille (answered by Marie-Zoé, `autrice`, undated)
 * and an anonymous entry — three comments in all, replies included.
 */
export const thread: ThreadEntry[] = [
  {
    id: 'article-comment-1',
    author: 'Camille',
    date: '3 juillet 2026',
    body: 'J’ai vu le film hier soir et je n’arrive toujours pas à en sortir. Votre avis met des mots sur ce que je n’arrivais pas à formuler.',
    likes: 9,
    reply: {
      id: 'article-comment-1-reply',
      author: 'Marie-Zoé',
      // Undated by design — the autrice reply shows the pill, not a date.
      date: '',
      body: 'Merci Camille — c’est exactement la scène du dîner qui m’a fait écrire cet avis.',
      isAuthor: true,
      likes: 4,
    },
  },
  {
    id: 'article-comment-2',
    author: 'Anonyme',
    date: '4 juillet 2026',
    body: 'Moins convaincu que vous sur la fin, mais l’avant-dernier plan vaut à lui seul le déplacement.',
    likes: 3,
  },
];
