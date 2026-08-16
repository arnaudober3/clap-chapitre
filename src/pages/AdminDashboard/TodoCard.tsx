import { Link } from 'react-router-dom';
import { adminEditPath, type Draft } from '../../content/dashboard';
import styles from './AdminDashboard.module.css';

/**
 * "À terminer" (design 6b): the unfinished drafts with a count badge, each a
 * colored dot, title and status.
 *
 * The title link is stretched over the whole row, so clicking anywhere resumes
 * the draft — in the avis editor or the bilan one, whichever it is a draft of.
 */
export default function TodoCard({ items }: { items: Draft[] }) {

  return (
    <section className={styles.card}>
      <div className={styles.todoHead}>
        <h2 className={styles.cardTitleSm}>À terminer</h2>
        <span className={styles.countBadge}>{items.length}</span>
      </div>
      <ul className={styles.todoList}>
        {items.map((draft) => (
          <li key={draft.id} className={styles.todoRow}>
            <span className={styles.todoDot} aria-hidden="true" />
            <Link to={adminEditPath(draft.kind, draft.id)} className={styles.todoTitle}>
              {draft.title}
            </Link>
            <span className={styles.todoStatus}>{draft.kindLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
