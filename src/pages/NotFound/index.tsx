import { Link } from 'react-router-dom';
import { NotFoundPanel } from '../../components/ui';
import styles from '../../components/ui/ui.module.css';

/** Public 404 "affiche" — design Salon 5b (desktop) / 5c (mobile). */
export default function NotFoundPage() {
  return (
    <NotFoundPanel testId="not-found-page">
      <Link to="/" className={styles.nfPrimary}>
        <span className={styles.nfDot} aria-hidden="true" />
        Retour à l'accueil
      </Link>
      <Link to="/me-suivre" className={styles.nfSecondary}>
        Me suivre
      </Link>
    </NotFoundPanel>
  );
}
