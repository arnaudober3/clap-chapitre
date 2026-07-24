import { Link } from 'react-router-dom';
import styles from './AdminDashboard.module.css';

/**
 * Floating "+" action (design 6h), mobile-only — hidden at the lg breakpoint
 * where the header's "+ Nouvel article" button takes over. Links to the Nouvel
 * article form.
 */
export default function Fab() {
  return (
    <Link to="/admin/articles/nouveau" className={styles.fab} aria-label="Nouvel article">
      +
    </Link>
  );
}
