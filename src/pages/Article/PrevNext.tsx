import { Link } from 'react-router-dom';
import type { Article } from '../../../shared/content';
import styles from './Article.module.css';

/**
 * The prev / next cards, desktop-only (hidden by CSS at the mobile breakpoint
 * per design 4b). A missing neighbour is omitted entirely — never rendered
 * disabled, never linking to `/article/undefined` — and the remaining card
 * keeps its own side. With neither neighbour, nothing renders at all.
 */
export default function PrevNext({
  prev,
  next,
}: {
  prev?: Article;
  next?: Article;
}) {
  if (!prev && !next) return null;

  return (
    <nav className={styles.prevNext} aria-label="Avis précédent et suivant">
      {prev ? (
        <Link
          to={`/article/${prev.id}`}
          className={styles.prevCard}
          data-testid="prev-card"
        >
          <span className={styles.prevNextLabel}>‹ Avis précédent</span>
          <span className={styles.prevNextTitle}>{prev.title}</span>
        </Link>
      ) : null}
      {next ? (
        <Link
          to={`/article/${next.id}`}
          className={styles.nextCard}
          data-testid="next-card"
        >
          <span className={styles.prevNextLabel}>Avis suivant ›</span>
          <span className={styles.prevNextTitle}>{next.title}</span>
        </Link>
      ) : null}
    </nav>
  );
}
