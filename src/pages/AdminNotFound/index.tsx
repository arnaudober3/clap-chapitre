import { Link } from 'react-router-dom';
import { NotFoundPanel } from '../../components/ui';
import styles from '../../components/ui/ui.module.css';

/**
 * 404 for any unknown /admin/** path. Same affiche as the public 404, inside
 * the admin shell rather than the public Layout — the rail stays put, so the
 * author is never stranded. Every rail destination is built, so this is only
 * ever reached by a hand-typed or stale URL: one way out is enough.
 */
export default function AdminNotFoundPage() {
  return (
    <NotFoundPanel testId="admin-not-found-page">
      <Link to="/admin" className={styles.nfPrimary}>
        <span className={styles.nfDot} aria-hidden="true" />
        Retour au dashboard
      </Link>
    </NotFoundPanel>
  );
}
