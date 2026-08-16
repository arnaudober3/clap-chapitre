import { Link } from 'react-router-dom';
import type { DraftBilan } from '../../../shared/content';
import MediumChips from './MediumChips';
import styles from './AdminBilans.module.css';

/**
 * The month in progress, in a card of its own above the listing (designs 9a and
 * 9b). A bilan is monthly, so the current month is never "one row among the
 * others": it is the thing the editor comes back to, with its tally so far, the
 * media still missing, and a single call to action.
 */
export default function CurrentBilanCard({ bilan }: { bilan: DraftBilan }) {
  return (
    <article className={styles.current} data-testid="current-bilan-card">
      <div className={styles.currentDate} aria-hidden="true">
        <span className={styles.currentMonth}>{bilan.monthLabel}</span>
        <span className={styles.currentYear}>{bilan.year}</span>
      </div>

      <div className={styles.currentBody}>
        <p className={styles.currentMeta}>
          <span className={styles.pillDraft}>En cours</span>
          <span className={styles.currentUpdated}>{bilan.updatedLabel}</span>
        </p>
        <h2 className={styles.currentTitle}>{bilan.title}</h2>
        {bilan.mood && <p className={styles.currentMood}>{bilan.mood}</p>}
        <p className={styles.currentChips}>
          <MediumChips counts={bilan.counts} />
        </p>
      </div>

      {/* The full-width button of design 9b spells out what it resumes; the
          narrow banner button of 9a sits right next to the title and doesn't
          need to. */}
      <Link to={`/admin/bilans/${bilan.id}`} className={styles.currentCta}>
        Reprendre<span className={styles.currentCtaUnit}> le bilan</span>
      </Link>
    </article>
  );
}
