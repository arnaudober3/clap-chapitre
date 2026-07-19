import { Link } from 'react-router-dom';
import type { Article } from '../../mock/types';
import { ReviewCard } from '../../components/ui';
import styles from './Home.module.css';

/**
 * The "AvisRecent" section: a serif section header with a hairline rule and a
 * "Tout voir" link to the /avis archive, followed by one shared ReviewCard per
 * item. Shows a Salon empty state when there are no items.
 */
export default function RecentAvisGrid({ items }: { items: Article[] }) {
  return (
    <section className={styles.recent}>
      <div className={styles.recentHead}>
        <h2 className={styles.recentLabel}>Avis récents</h2>
        <span className={styles.recentRule} aria-hidden="true" />
        <Link to="/archives" className={styles.recentAll}>
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