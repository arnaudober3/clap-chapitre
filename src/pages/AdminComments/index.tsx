import { useState } from 'react';
import { useAdminComments, type ModerationComment } from '../../api/admin';
import { approveComment, deleteComment } from '../../api/mutations';
import { useAdminPageKicker } from '../../components/layout/adminPageMeta';
import { PageError, PageLoading } from '../../components/ui';
import { longDate } from '../../format';
import styles from './AdminComments.module.css';

const SUBTITLE = 'Les messages déposés sur les avis et les bilans';

type Filter = 'pending' | 'approved' | 'all';

const FILTERS: Array<{ id: Filter; label: string }> = [
  { id: 'pending', label: 'En attente' },
  { id: 'approved', label: 'Publiés' },
  { id: 'all', label: 'Tous' },
];

/**
 * The moderation queue.
 *
 * It is what makes the `pending` status honest rather than a trap: comments
 * arrive invisible, and without a screen to release them they would simply pile
 * up where nobody could ever see them.
 *
 * Defaults to what is waiting, since that is the only reason to open it.
 */
export default function AdminCommentsPage() {
  const [filter, setFilter] = useState<Filter>('pending');
  const { data, status, reload } = useAdminComments(filter);

  useAdminPageKicker(SUBTITLE);

  return (
    <section className={styles.page} data-testid="admin-comments-page" data-anim="stagger">
      <div className={styles.topbar}>
        <div>
          <h1 className={styles.title}>Commentaires</h1>
          <p className={styles.subtitle}>
            {SUBTITLE}
            {data ? ` · ${data.pending} en attente` : ''}
          </p>
        </div>
        <div className={styles.filters}>
          {FILTERS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              className={
                entry.id === filter ? `${styles.filter} ${styles.filterActive}` : styles.filter
              }
              aria-pressed={entry.id === filter}
              onClick={() => setFilter(entry.id)}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </div>

      {status === 'loading' || status === 'idle' ? (
        <PageLoading />
      ) : !data ? (
        <PageError onRetry={reload} />
      ) : data.items.length === 0 ? (
        <p className={styles.empty}>
          {filter === 'pending'
            ? 'Rien à relire pour l’instant.'
            : 'Aucun commentaire à afficher.'}
        </p>
      ) : (
        <ul className={styles.list}>
          {data.items.map((comment) => (
            <CommentRow key={comment.id} comment={comment} onDone={reload} />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * One entry, with its two acts.
 *
 * The pending state is kept per row rather than on the page: approving one
 * comment must not grey out the twelve others while it lands.
 */
function CommentRow({
  comment,
  onDone,
}: {
  comment: ModerationComment;
  onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function act(work: () => Promise<unknown>) {
    setBusy(true);
    try {
      await work();
      // Refetching rather than removing the row locally: the `pending` counter
      // in the header comes from the same payload, and a local splice would
      // leave it stale.
      onDone();
    } finally {
      setBusy(false);
    }
  }

  const pending = comment.status === 'pending';

  return (
    <li
      className={pending ? `${styles.row} ${styles.rowPending}` : styles.row}
      data-testid="moderation-row"
    >
      <div className={styles.meta}>
        <span className={styles.author}>{comment.author}</span>
        <span className={styles.target}>
          sur « {comment.targetTitle || comment.targetId} »
        </span>
        {comment.isReply && <span className={styles.badge}>réponse</span>}
        {pending && <span className={styles.badge}>en attente</span>}
        {/* ISO in, French here — the wire never carries a display string. */}
        {comment.date && <span>{longDate(comment.date)}</span>}
      </div>

      <p className={styles.body}>{comment.body}</p>

      <div className={styles.rowActions}>
        {pending && (
          <button
            type="button"
            className={styles.action}
            disabled={busy}
            onClick={() => void act(() => approveComment(comment.id))}
          >
            {busy ? 'Un instant…' : 'Approuver'}
          </button>
        )}

        {confirming ? (
          <>
            <button
              type="button"
              className={styles.action}
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Annuler
            </button>
            <button
              type="button"
              className={`${styles.action} ${styles.actionDanger}`}
              disabled={busy}
              onClick={() => void act(() => deleteComment(comment.id))}
            >
              Confirmer la suppression
            </button>
          </>
        ) : (
          <button
            type="button"
            className={`${styles.action} ${styles.actionDanger}`}
            disabled={busy}
            onClick={() => setConfirming(true)}
          >
            Supprimer
          </button>
        )}
      </div>
    </li>
  );
}
