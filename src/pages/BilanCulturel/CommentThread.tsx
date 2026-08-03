import { useLike } from '../../api/useLike';
import { CommentComposer, ShareMenu } from '../../components/ui';
import type { MonthlyBilan } from '../../../shared/content';
import type { Comment } from '../../../shared/content';
import styles from './BilanCulturel.module.css';

/** Total comment count: top-level entries plus any nested replies. */
function countComments(entries: Comment[]): number {
  return entries.reduce(
    (total, entry) => total + 1 + (entry.reply ? 1 : 0),
    0,
  );
}

/** A single thread entry: avatar, name (+ author badge), date, body, affordances. */
function Entry({ entry, nested }: { entry: Comment; nested?: boolean }) {
  const like = useLike('comment', entry.id, entry.likes);

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
          <button
            type="button"
            className={styles.commentAction}
            onClick={like.toggle}
            disabled={like.pending}
            aria-pressed={like.liked}
          >
            {like.liked ? '♥' : '♡'} {like.likes}
          </button>
          {/* Still inert — see the same button on the avis thread. */}
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
 * The whole-bilan social bar and its comment thread. The social bar shows the
 * ♡ (now a real toggle, deduplicated per visitor server-side), a "<n>
 * commentaires" count derived from the thread, and a "Partager" control. Below:
 * a "Commentaires · <n>" heading, the composer, and the entries — with an
 * "autrice" badge on the author's and one nested reply.
 *
 * "Partager" opens the share menu, which needs the month it is sharing, so the
 * page passes `bilan` down. The thread holds approved comments only: a new one
 * goes to moderation, and the composer says so rather than appearing to fail.
 */
export default function CommentThread({
  bilan,
  comments,
}: {
  bilan: MonthlyBilan;
  comments: Comment[];
}) {
  const count = countComments(comments);
  const like = useLike('bilan', bilan.id, bilan.likes);

  return (
    <section className={styles.social} data-anim="stagger">
      <div className={styles.socialBar}>
        <button
          type="button"
          className={styles.likeButton}
          onClick={like.toggle}
          disabled={like.pending}
          aria-pressed={like.liked}
        >
          {like.liked ? '♥' : '♡'} J’aime · {like.likes}
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

      <CommentComposer
        targetType="bilan"
        targetId={bilan.id}
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
