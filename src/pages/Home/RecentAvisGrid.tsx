import { Link } from 'react-router-dom';
import type { Article, Medium } from '../../../shared/content';
import { MEDIUM_TO_SEGMENT, DEFAULT_SEGMENT } from '../../media';
import { ReviewCard } from '../../components/ui';
import styles from './Home.module.css';

/**
 * The "Avis récents" section: a serif section header with a hairline rule and a
 * "Tout voir" link into the avis archive filtered to the current `medium`
 * (`/archives/<segment>`), followed by one shared ReviewCard per item. Shows a
 * Salon empty state when there are no items.
 */
export default function RecentAvisGrid({
  items,
  medium,
}: {
  items: Article[];
  medium?: Medium;
}) {
  const segment = medium ? MEDIUM_TO_SEGMENT[medium] : DEFAULT_SEGMENT;
  return (
    <section className={styles.recent}>
      <div className={styles.recentHead}>
        <h2 className={styles.recentLabel}>Avis récents</h2>
        <span className={styles.recentRule} aria-hidden="true" />
        <Link to={`/archives/${segment}`} className={styles.recentAll}>
          Tout voir
        </Link>
      </div>
      {items.length === 0 ? (
        <p className={styles.empty}>Aucun avis pour ce médium pour l’instant.</p>
      ) : (
        <div className={styles.grid}>
          {items.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}