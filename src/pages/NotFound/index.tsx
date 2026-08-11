import { Link, useLocation } from 'react-router-dom';
import { NotFoundPanel } from '../../components/ui';
import { Seo } from '../../seo/Seo';
import { NOT_FOUND_SEO } from '../../seo/staticCopy';
import styles from '../../components/ui/ui.module.css';

/** Public 404 "affiche" — design Salon 5b (desktop) / 5c (mobile). */
export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <NotFoundPanel testId="not-found-page">
      <Seo
        title={NOT_FOUND_SEO.title}
        description={NOT_FOUND_SEO.description}
        path={pathname}
        noindex
      />
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
