import { Link } from 'react-router-dom';
import type { Article, Medium } from '../../mock/types';
import styles from './Home.module.css';

const MEDIUM_LABEL: Record<Medium, string> = {
  film: 'Film',
  serie: 'Série',
  livre: 'Livre',
  doc: 'Doc',
};

/** Maps a medium to its accent color token for the card label. */
const MEDIUM_ACCENT: Record<Medium, string> = {
  film: 'var(--medium-film)',
  serie: 'var(--medium-serie)',
  livre: 'var(--medium-livre)',
  doc: 'var(--medium-docs)',
};

function ReviewCard({ item }: { item: Article }) {
  return (
    <Link to={`/article/${item.id}`} className={styles.card}>
      <div className={styles.cardCover} style={{ background: item.cover }}>
        <span className={styles.cardCoverTitle}>{item.title}</span>
      </div>
      <div className={styles.cardBody}>
        <span
          className={styles.cardMedium}
          style={{ color: MEDIUM_ACCENT[item.medium] }}
        >
          {MEDIUM_LABEL[item.medium]}
        </span>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardExcerpt}>{item.excerpt}</p>
        <p className={styles.cardMeta}>
          ♡ {item.likes} · {item.comments} commentaires
        </p>
      </div>
    </Link>
  );
}

/**
 * The "Avis récents" section: a serif section header with a hairline rule and a
 * "Tout voir" link, followed by one review card per item. Shows a Salon empty
 * state when there are no items.
 */
export default function RecentGrid({ items }: { items: Article[] }) {
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
