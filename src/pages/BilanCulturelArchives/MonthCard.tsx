import { Link } from 'react-router-dom';
import type { MonthlyBilan } from '../../mock/bilans';
import { PosterThumb } from '../../components/ui';
import styles from './BilanCulturelArchives.module.css';

/**
 * An BilanCulturelArchives month card: a bordered --surface card whose top is a collage of
 * up to 3 gradient PosterThumb tiles (the month's first up-to-3 avis[].cover),
 * and whose body is the serif monthLabel, a `N avis` count from avis.length,
 * and — only when isLatest — a "dernier" pill. The whole card deep-links to the
 * bilan (`/bilan-culturel?mois=<id>`), not to an article. A month with fewer
 * than 3 avis renders only the covers available; 0 avis renders no thumbnails.
 */
export default function MonthCard({
  bilan,
  isLatest = false,
}: {
  bilan: MonthlyBilan;
  isLatest?: boolean;
}) {
  const covers = bilan.avis.slice(0, 3);

  return (
    <Link
      to={`/bilan-culturel?mois=${bilan.id}`}
      className={styles.monthCard}
      data-testid="month-card"
    >
      {covers.length > 0 && (
        <div className={styles.collage} data-testid="month-card-collage">
          {covers.map((avis) => (
            <PosterThumb
              key={avis.id}
              cover={avis.cover}
              className={styles.collageTile}
            />
          ))}
        </div>
      )}
      <div className={styles.monthCardBody}>
        <div className={styles.monthCardTitleRow}>
          <h3 className={styles.monthCardTitle}>{bilan.monthLabel}</h3>
          {isLatest && (
            <span className={styles.dernierPill} data-testid="dernier-pill">
              dernier
            </span>
          )}
        </div>
        <p className={styles.monthCardCount}>{bilan.avis.length} avis</p>
      </div>
    </Link>
  );
}
