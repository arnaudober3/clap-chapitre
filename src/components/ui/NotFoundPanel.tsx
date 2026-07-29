import type { ReactNode } from 'react';
import styles from './ui.module.css';

export interface NotFoundPanelProps {
  /** The actions under the copy — one or two links, laid out by the panel. */
  children: ReactNode;
  /** Marks the page that owns this panel, e.g. 'not-found-page'. */
  testId: string;
}

/**
 * The 404 "affiche" of designs 5b (desktop) / 5c (mobile): a missing-cover
 * poster over the standing copy. Shared by the public 404 and the admin one —
 * only the actions differ, so they come in as children and everything above
 * them stays identical between the two shells.
 *
 * The poster is CSS alone (dashed frame, film-strip perforations as a repeating
 * gradient) — there is no image to miss.
 */
export default function NotFoundPanel({ children, testId }: NotFoundPanelProps) {
  return (
    <section className={styles.nfPage} data-testid={testId}>
      <div className={styles.nfPoster} aria-hidden="true">
        <span className={styles.nfFilmstrip} />
        <span className={styles.nfCode}>404</span>
        <span className={styles.nfPosterLabel}>Affiche manquante</span>
        <span className={`${styles.nfFilmstrip} ${styles.nfFilmstripRight}`} />
      </div>
      <h1 className={styles.nfTitle}>Ce chapitre reste à écrire.</h1>
      <p className={styles.nfLede}>
        La page que vous cherchez n'existe pas — ou plus. Un lien cassé, ou une
        histoire rangée ailleurs.
      </p>
      <div className={styles.nfActions}>{children}</div>
    </section>
  );
}
