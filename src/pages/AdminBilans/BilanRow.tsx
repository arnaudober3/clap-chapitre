import { Link } from 'react-router-dom';
import type { PublishedBilan } from '../../../shared/content';
import { frNumber, shortDate } from '../../format';
import MediumChips from './MediumChips';
import styles from './AdminBilans.module.css';

/**
 * One published month. A single DOM serves both designs: a dense grid row at lg
 * (9a) and a stacked card below it (9b) — the `metaGroup` / `statsGroup`
 * wrappers collapse via `display: contents` on desktop so their children join
 * the row grid directly. The title link is stretched over the whole row, so
 * clicking anywhere opens the bilan. The month leads the title: this is the
 * "Mois" column, and a bilan's title is editorial only — the month it covers
 * lives in the model, not in the copy.
 */
export default function BilanRow({ bilan }: { bilan: PublishedBilan }) {
  return (
    <li className={styles.row} data-testid="admin-bilan-row">
      <span className={styles.titleCell}>
        <Link to={`/admin/bilans/${bilan.id}`} className={styles.rowTitle}>
          {bilan.monthLabel} {bilan.year} - {bilan.title}
        </Link>
        {bilan.mood && <span className={styles.rowSub}>{bilan.mood}</span>}
      </span>

      <span className={styles.metaGroup}>
        <span className={styles.chips}>
          <MediumChips counts={bilan.counts} />
        </span>
        <span className={styles.dateCell}>
          <span className={styles.cellUnit}>publié le </span>
          {shortDate(bilan.publishedAt)}
        </span>
      </span>

      <span className={styles.statsGroup}>
        <span className={`${styles.numberCell} ${styles.viewsCell}`}>
          {frNumber(bilan.views)}
          <span className={styles.cellUnit}> vues</span>
        </span>
        <span className={styles.numberCell}>
          <span className={styles.cellUnit} aria-hidden="true">
            ♥{' '}
          </span>
          {frNumber(bilan.likes)}
        </span>
      </span>

      <span className={styles.statusCell}>
        <span className={styles.pill}>Publié</span>
      </span>
    </li>
  );
}
