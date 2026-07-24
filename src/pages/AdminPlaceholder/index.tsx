import { useLocation } from 'react-router-dom';
import { adminNav } from '../../components/layout/adminNav';
import styles from './AdminPlaceholder.module.css';

/** Longest-matching admin nav label for the current path (falls back to a generic). */
function activeLabel(pathname: string): string {
  const here = pathname.toLowerCase();
  const match = adminNav
    .filter((item) => item.to !== '/admin' && here.startsWith(item.to.toLowerCase()))
    .sort((a, b) => b.to.length - a.to.length)[0];
  return match?.label ?? 'Cette section';
}

/**
 * Shared "à venir" state for every admin section that isn't the Tableau de bord
 * yet. Only the dashboard is wired in this prototype; the other rail links land
 * here so navigation and active-link highlighting still work.
 */
export default function AdminPlaceholder() {
  const { pathname } = useLocation();
  const label = activeLabel(pathname);

  return (
    <section className={styles.page} data-testid="admin-placeholder-page">
      <div className={styles.card}>
        <span className={styles.kicker}>Espace admin</span>
        <h1 className={styles.title}>{label}</h1>
        <p className={styles.note}>Cette section arrive bientôt.</p>
      </div>
    </section>
  );
}
