import { useState } from 'react';
import type { Comment } from '../../../shared/content';
import styles from './Article.module.css';

/** Total comment count: top-level entries plus any nested replies. */
function countComments(entries: Comment[]): number {
  return entries.reduce((total, entry) => total + 1 + (entry.reply ? 1 : 0), 0);
}

/** Anonymous entries get a `?` monogram on a neutral border-colored avatar. */
function monogramOf(author: string): string {
  return author === 'Anonyme' ? '?' : author.charAt(0);
}

/** One entry: avatar, name (+ autrice pill), date, body and inert affordances. */
function Entry({ entry, nested }: { entry: Comment; nested?: boolean }) {
  const anonymous = entry.author === 'Anonyme';
  const avatarClass = [
    styles.commentAvatar,
    entry.isAuthor ? styles.commentAvatarAuthor : '',
    anonymous ? styles.commentAvatarAnon : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={nested ? styles.commentReply : styles.comment}
      data-testid={nested ? 'comment-reply' : 'comment-entry'}
    >
      <span className={avatarClass} aria-hidden="true">
        {monogramOf(entry.author)}
      </span>
      <div className={styles.commentBody}>
        <p className={styles.commentHead}>
          <span className={styles.commentName}>{entry.author}</span>
          {entry.isAuthor ? (
            <span className={styles.authorBadge}>autrice</span>
          ) : null}
          {entry.date ? (
            <span className={styles.commentDate}>{entry.date}</span>
          ) : null}
        </p>
        <p className={styles.commentText}>{entry.body}</p>
        {/* The autrice reply carries no affordances of its own, per design. */}
        {entry.isAuthor ? null : (
          <p className={styles.commentActions}>
            <button type="button" className={styles.commentAction}>
              ♡ {entry.likes}
            </button>
            <button type="button" className={styles.commentAction}>
              Répondre
            </button>
          </p>
        )}
        {entry.reply ? <Entry entry={entry.reply} nested /> : null}
      </div>
    </div>
  );
}

/**
 * The article comment section: the "Commentaires · n" heading (n counts nested
 * replies too), an inert composer and the thread, which arrives already nested
 * from `/api/articles/:id`.
 *
 * The composer is one <form> in both layouts: a card on desktop (comment field,
 * name field, "Publier" pill) that becomes the sticky bottom bar of design 4b
 * at the mobile breakpoint, where the name field is dropped. Submitting calls
 * preventDefault — nothing navigates, persists or appears.
 */
export default function CommentThread({ comments }: { comments: Comment[] }) {
  const [comment, setComment] = useState('');
  const [name, setName] = useState('');
  const count = countComments(comments);

  return (
    <section
      className={styles.comments}
      data-testid="article-comments"
      data-anim="stagger"
    >
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
            placeholder="Nom — ou rester anonyme"
            aria-label="Nom — ou rester anonyme"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <button type="submit" className={styles.composerButton}>
            Publier
          </button>
        </div>
      </form>

      <div className={styles.thread} data-anim="stagger">
        {comments.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
