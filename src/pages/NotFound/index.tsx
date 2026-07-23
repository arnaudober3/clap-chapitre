import { Link } from 'react-router-dom';
import styles from './NotFound.module.css';

/** 404 "affiche" — design Salon 5b (desktop) / 5c (mobile). */
export default function NotFoundPage() {
  return (
    <section className={styles.page} data-testid="not-found-page">
      <div className={styles.poster} aria-hidden="true">
        <span className={styles.filmstrip} />
        <span className={styles.code}>404</span>
        <span className={styles.posterLabel}>Affiche manquante</span>
        <span className={`${styles.filmstrip} ${styles.filmstripRight}`} />
      </div>
      <h1 className={styles.title}>Ce chapitre reste à écrire.</h1>
      <p className={styles.lede}>
        La page que vous cherchez n'existe pas — ou plus. Un lien cassé, ou une
        histoire rangée ailleurs.
      </p>
      <div className={styles.actions}>
        <Link to="/" className={styles.primary}>
          <span className={styles.dot} aria-hidden="true" />
          Retour à l'accueil
        </Link>
        <Link to="/me-suivre" className={styles.secondary}>
          Me suivre
        </Link>
      </div>
    </section>
  );
}
