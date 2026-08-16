import type { MonthlyBilan } from '../../../shared/content';
import { MEDIA } from '../../media';
import BilanReview from './BilanReview';
import styles from './BilanCulturel.module.css';

/**
 * The month's reviews grouped by medium. Optionally renders an "L'humeur du
 * mois" lead block (2px --ink top rule, eyebrow, serif mood paragraph) above
 * the sections when the month has a mood. Then, for each medium that has avis
 * — in the fixed Films → Séries → Livres → Docs order — a serif uppercase
 * accent section header + hairline rule followed by its BilanReview blocks.
 * Media with no avis render no section. Order is derived from MEDIA, not raw
 * feed order; within a medium, avis keep their mock order.
 */
export default function MediumSections({ bilan }: { bilan: MonthlyBilan }) {
  return (
    <div className={styles.sections} data-anim="stagger">
      {bilan.mood ? (
        <section className={styles.mood}>
          <p className={styles.moodEyebrow}>L’humeur du mois</p>
          <p className={styles.moodBody}>{bilan.mood}</p>
        </section>
      ) : null}
      {MEDIA.map(({ medium, label }) => {
        const avis = bilan.avis.filter((item) => item.medium === medium);
        if (avis.length === 0) return null;
        return (
          <section key={medium} className={styles.mediumSection}>
            <div className={styles.mediumHead}>
              <h2 className={styles.mediumLabel}>{label}</h2>
              <span className={styles.mediumRule} aria-hidden="true" />
            </div>
            <div className={styles.reviews} data-anim="stagger">
              {avis.map((item) => (
                <BilanReview key={item.id} item={item} />
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
