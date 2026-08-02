import { useSearchParams } from 'react-router-dom';
import { bilanById, bilans, latestBilan } from '../../mock/bilans';
import MonthSwitcher from './MonthSwitcher';
import MediumSections from './MediumSections';
import CommentThread from './CommentThread';
import styles from './BilanCulturel.module.css';

/**
 * Salon Bilan culturel page. Reads the `mois` query param, resolves the active
 * month as `bilanById(mois) ?? latestBilan()` and composes the month switcher,
 * the humeur + medium-grouped reviews, the whole-bilan social bar and the
 * comment thread inside the shared Layout's <main>. Unknown/malformed `mois`
 * falls back to the latest bilan; an empty `bilans` renders a Salon empty state
 * instead of dereferencing `latestBilan()`.
 */
export default function BilanCulturelPage() {
  const [searchParams] = useSearchParams();
  const mois = searchParams.get('mois');

  if (bilans.length === 0) {
    return (
      <section className={styles.page} data-testid="bilan-culturel-page" data-anim="stagger">
        <p className={styles.eyebrow}>Bilan culturel</p>
        <p className={styles.empty}>Aucun bilan pour l’instant.</p>
      </section>
    );
  }

  const active = (mois ? bilanById(mois) : undefined) ?? latestBilan();

  return (
    <section className={styles.page} data-testid="bilan-culturel-page" data-anim="stagger">
      <MonthSwitcher active={active} months={bilans} />
      <MediumSections bilan={active} />
      <CommentThread bilan={active} />
    </section>
  );
}
