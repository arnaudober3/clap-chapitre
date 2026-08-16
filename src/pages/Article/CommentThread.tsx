import { useLike } from '../../api/useLike';
import { CommentComposer } from '../../components/ui';
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

/** One entry: avatar, name (+ autrice pill), date, body and its ♡. */
function Entry({ entry, nested }: { entry: Comment; nested?: boolean }) {
  const anonymous = entry.author === 'Anonyme';
  const like = useLike('comment', entry.id, entry.likes);
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
            <button
              type="button"
              className={styles.commentAction}
              onClick={like.toggle}
              disabled={like.pending}
              aria-pressed={like.liked}
            >
              {like.liked ? '♥' : '♡'} {like.likes}
            </button>
            {/* Still inert: a reply needs its own composer targeting this
                entry, and the thread is one level deep — see DEV notes. */}
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
 * replies too), the composer and the thread, which arrives already nested from
 * `/api/articles/:id` — approved entries only.
 *
 * The composer is one <form> in both layouts: a card on desktop (comment field,
 * name field, "Publier" pill) that becomes the sticky bottom bar of design 4b at
 * the mobile breakpoint, where the name field is dropped. Submitting now writes,
 * and the entry lands in moderation rather than in the thread — which is why the
 * composer answers with a sentence saying so.
 */
export default function CommentThread({
  comments,
  articleId,
}: {
  comments: Comment[];
  articleId: string;
}) {
  const count = countComments(comments);

  return (
    <section
      className={styles.comments}
      data-testid="article-comments"
      data-anim="stagger"
    >
      <h2 className={styles.commentsHeading}>Commentaires · {count}</h2>

      <CommentComposer
        targetType="article"
        targetId={articleId}
        classes={{
          form: styles.composer,
          field: styles.composerField,
          row: styles.composerRow,
          name: styles.composerName,
          button: styles.composerButton,
          notice: styles.composerNotice,
        }}
      />

      <div className={styles.thread} data-anim="stagger">
        {comments.map((entry) => (
          <Entry key={entry.id} entry={entry} />
        ))}
      </div>
    </section>
  );
}
