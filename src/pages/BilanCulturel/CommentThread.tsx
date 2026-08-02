import { useState } from 'react';
import { ShareMenu } from '../../components/ui';
import type { MonthlyBilan } from '../../mock/bilans';
import { thread, likes, type ThreadEntry } from './thread';
import styles from './BilanCulturel.module.css';

/** Total comment count: top-level entries plus any nested replies. */
function countComments(entries: ThreadEntry[]): number {
  return entries.reduce(
    (total, entry) => total + 1 + (entry.reply ? 1 : 0),
    0,
  );
}

/** A single thread entry: avatar, name (+ author badge), date, body, affordances. */
function Entry({ entry, nested }: { entry: ThreadEntry; nested?: boolean }) {
  return (
    <div className={nested ? styles.commentReply : styles.comment}>
      <div className={styles.commentAvatar} aria-hidden="true">
        {entry.author.charAt(0)}
      </div>
      <div className={styles.commentBody}>
        <p className={styles.commentHead}>
          <span className={styles.commentName}>{entry.author}</span>
          {entry.isAuthor ? (
            <span className={styles.authorBadge}>autrice</span>
          ) : null}
          <span className={styles.commentDate}>{entry.date}</span>
        </p>
        <p className={styles.commentText}>{entry.body}</p>
        <p className={styles.commentActions}>
          <button type="button" className={styles.commentAction}>
            ♡ {entry.likes}
          </button>
          <button type="button" className={styles.commentAction}>
            Répondre
          </button>
        </p>
        {entry.reply ? <Entry entry={entry.reply} nested /> : null}
      </div>
    </div>
  );
}

/**
 * The whole-bilan social bar + inert comment thread. The social bar shows a
 * "♡ J'aime · <likes>" button, a "<n> commentaires" count (derived from the
 * thread) and a "Partager" control. Below: a "Commentaires · <n>" heading, an
 * inert composer (comment field, name field, "Publier" button) and the thread
 * entries with an "autrice" badge on author entries and one nested reply.
 *
 * "Partager" opens the share menu — it needs the month it is sharing, so the
 * page passes `bilan` down. Everything else is inert: the composer form calls
 * preventDefault; no control navigates, reloads, mutates, or throws.
 */
export default function CommentThread({ bilan }: { bilan: MonthlyBilan }) {
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const count = countComments(thread);

  return (
    <section className={styles.social}>
      <div className={styles.socialBar}>
        <button type="button" className={styles.likeButton}>
          ♡ J’aime · {likes}
        </button>
        <span className={styles.socialCount}>{count} commentaires</span>
        <ShareMenu
          title={bilan.title}
          excerpt={bilan.mood}
          path={`/bilan-culturel?mois=${bilan.id}`}
          triggerClassName={styles.socialButton}
          data-testid="bilan-share"
        />
      </div>

      <h2 className={styles.commentsHeading}>Commentaires · {count}</h2>

      <form
        className={styles.composer}
        onSubmit={(event) => event.preventDefault()}
      >
        <textarea
          className={styles.composerField}
          placeholder="Votre commentaire…"
          aria-label="Votre commentaire"
          value={comment}
          onChange={(event) => setComment(event.target.value)}
        />
        <div className={styles.composerRow}>
          <input
            type="text"
            className={styles.composerName}
            placeholder="Votre nom"
            aria-label="Votre nom"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className={styles.composerButton}>
            Publier
          </button>
        </div>
      </form>

      <div className={styles.thread}>
        {thread.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
