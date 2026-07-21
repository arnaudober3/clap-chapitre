import type { Medium } from '../../mock/types';
import type { MonthlyBilan } from '../../mock/bilans';
import BilanReview from './BilanReview';
import styles from './BilanCulturel.module.css';

/** Fixed medium order for the month's sections: Films → Séries → Livres → Docs. */
const MEDIUM_ORDER: Medium[] = ['film', 'serie', 'livre', 'doc'];

/** Section header label per medium (serif uppercase accent header). */
const SECTION_LABEL: Record<Medium, string> = {
  film: 'Films',
  serie: 'Séries',
  livre: 'Livres',
  doc: 'Docs',
};

/**
 * The month's reviews grouped by medium. Optionally renders an "L'humeur du
 * mois" lead block (2px --ink top rule, eyebrow, serif mood paragraph) above
 * the sections when the month has a mood. Then, for each medium that has avis
 * — in the fixed Films → Séries → Livres → Docs order — a serif uppercase
 * accent section header + hairline rule followed by its BilanReview blocks.
 * Media with no avis render no section. Order is derived from MEDIUM_ORDER,
 * not raw feed order; within a medium, avis keep their mock order.
 */
export default function MediumSections({ bilan }: { bilan: MonthlyBilan }) {
  return (
    <div className={styles.sections}>
      {bilan.mood ? (
        <section className={styles.mood}>
          <p className={styles.moodEyebrow}>L’humeur du mois</p>
          <p className={styles.moodBody}>{bilan.mood}</p>
        </section>
      ) : null}
      {MEDIUM_ORDER.map((medium) => {
        const avis = bilan.avis.filter((item) => item.medium === medium);
        if (avis.length === 0) return null;
        return (
          <section key={medium} className={styles.mediumSection}>
            <div className={styles.mediumHead}>
              <h2 className={styles.mediumLabel}>{SECTION_LABEL[medium]}</h2>
              <span className={styles.mediumRule} aria-hidden="true" />
            </div>
            <div className={styles.reviews}>
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
