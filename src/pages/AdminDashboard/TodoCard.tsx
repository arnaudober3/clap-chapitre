import { drafts } from '../../mock/dashboard';
import styles from './AdminDashboard.module.css';

/**
 * "À terminer" (design 6b): the unfinished drafts with a count badge. Rows are
 * mock affordances — they carry a colored dot, title and status.
 */
export default function TodoCard() {
  const items = drafts();

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
            <span className={styles.todoTitle}>{draft.title}</span>
            <span className={styles.todoStatus}>{draft.kindLabel}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
