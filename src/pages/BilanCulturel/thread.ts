/**
 * Page-local static comment thread for the Bilan culturel page. Uses the shared
 * `Comment` type but is deliberately NOT added to the frozen `MonthlyBilan`
 * model — the thread and the like count are presentational mock only, with no
 * backend, persistence, or validation.
 */
import type { Comment } from '../../mock/types';

/** A thread entry with an optional single nested reply. */
export interface ThreadEntry extends Comment {
  /** ♡ like count on this entry (presentational). */
  likes: number;
  /** A single nested reply, when present. */
  reply?: ThreadEntry;
}

/** Presentational like count for the whole-bilan social bar. */
export const likes = 214;

/** The static comment thread, author Marie-Zoé flagged with `isAuthor`. */
export const thread: ThreadEntry[] = [
  {
    id: 'bilan-comment-1',
    author: 'Camille',
    date: '28 juin 2026',
    body: 'Ce bilan m’a donné envie de tout rattraper cet été. Merci Marie-Zoé !',
    likes: 12,
    reply: {
      id: 'bilan-comment-1-reply',
      author: 'Marie-Zoé',
      date: '28 juin 2026',
      body: 'Avec grand plaisir — commencez par La lumière du Nord, vous m’en direz des nouvelles.',
      isAuthor: true,
      likes: 5,
    },
  },
  {
    id: 'bilan-comment-2',
    author: 'Théo',
    date: '29 juin 2026',
    body: 'Totalement d’accord sur Ceux qui restent, la série de l’année pour moi.',
    likes: 8,
  },
];
