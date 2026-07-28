import styles from './AdminAPropos.module.css';

/**
 * The portrait slot of design 6f / 7e. The public À propos page renders the
 * portrait as a CSS gradient (--portrait-grad), so the field previews that
 * gradient rather than an empty dropzone — same idea as the "Affiche" dropzone
 * of the article form. There is no upload in this prototype: the control is a
 * button so it stays reachable, and it does nothing.
 */
export default function PortraitField() {
  return (
    <div className={styles.portraitField}>
      <span className={styles.portraitLabel}>Portrait</span>
      <button type="button" className={styles.portrait} aria-label="Changer le portrait">
        <span className={styles.portraitOverlay}>
          <span className={styles.portraitIcon} aria-hidden="true">
            ↑
          </span>
          <span className={styles.portraitAction}>Changer</span>
        </span>
      </button>
    </div>
  );
}
