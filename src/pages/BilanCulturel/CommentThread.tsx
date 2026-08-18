import { useEffect, useState } from "react";
import { useLike } from "../../api/useLike";
import { useAuth } from "../../auth/AuthContext";
import { CommentComposer, ReplyComposer, ShareMenu } from "../../components/ui";
import type { Comment, MonthlyBilan } from "../../../shared/content";
import styles from "./BilanCulturel.module.css";

/** Total comment count: top-level entries plus any nested replies. */
function countComments(entries: Comment[]): number {
  return entries.reduce((total, entry) => total + 1 + (entry.reply ? 1 : 0), 0);
}

/** A single thread entry: avatar, name (+ author badge), date, body, affordances. */
function Entry({
  entry,
  nested,
  onReplied,
}: {
  entry: Comment;
  nested?: boolean;
  onReplied?: (parentId: string, reply: Comment) => void;
  key?: string;
}) {
  const like = useLike("comment", entry.id, entry.likes);
  const { status } = useAuth();
  const [replying, setReplying] = useState(false);
  // Only an admin may reply, only to a root comment, and only once — the
  // thread renders a single reply, so a second one would have nowhere to go.
  const canReply =
    !nested && !entry.isAuthor && !entry.reply && status === "authenticated";

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
            {like.liked ? "♥" : "♡"} {like.likes}
          </button>
          {/* Hidden outright for a visitor: only a signed-in editor may
              answer a comment. Hidden while the composer itself is open, so
              the two "Répondre" labels are never both on screen at once. */}
          {canReply && !replying ? (
            <button
              type="button"
              className={styles.commentAction}
              onClick={() => setReplying(true)}
            >
              Répondre
            </button>
          ) : null}
        </p>
        {replying ? (
          <ReplyComposer
            commentId={entry.id}
            classes={{
              form: styles.replyForm,
              field: styles.replyField,
              actions: styles.replyActions,
              button: styles.replyButton,
              cancel: styles.replyCancel,
              notice: styles.replyNotice,
            }}
            onCancel={() => setReplying(false)}
            onReplied={(reply) => {
              setReplying(false);
              onReplied?.(entry.id, reply);
            }}
          />
        ) : null}
        {entry.reply ? <Entry entry={entry.reply} nested /> : null}
      </div>
    </div>
  );
}

/**
 * The whole-bilan social bar and its comment thread. The social bar shows the
 * ♡ (now a real toggle, deduplicated per visitor server-side) and a "Partager"
 * control. Below: a "Commentaires · <n>" heading, the composer, and the
 * entries — with an "autrice" badge on the author's and one nested reply.
 *
 * "Partager" opens the share menu, which needs the month it is sharing, so the
 * page passes `bilan` down. The thread holds approved comments only: a new one
 * goes to moderation, and the composer says so rather than appearing to fail.
 */
export default function CommentThread({
  bilan,
  comments: fetched,
}: {
  bilan: MonthlyBilan;
  comments: Comment[];
}) {
  // Local so an admin reply — approved on the spot, unlike a visitor's — can
  // join the thread immediately instead of waiting on a refetch.
  const [comments, setComments] = useState(fetched);
  useEffect(() => setComments(fetched), [fetched]);

  function handleReplied(parentId: string, reply: Comment) {
    setComments((current) =>
      current.map((entry) =>
        entry.id === parentId ? { ...entry, reply } : entry,
      ),
    );
  }

  const count = countComments(comments);
  const like = useLike("bilan", bilan.id, bilan.likes);

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
          {like.liked ? "♥" : "♡"} J’aime · {like.likes}
        </button>
        <ShareMenu
          title={bilan.title}
          excerpt={bilan.mood}
          targetType="bilan"
          targetId={bilan.id}
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
          <Entry key={entry.id} entry={entry} onReplied={handleReplied} />
        ))}
      </div>
    </section>
  );
}
