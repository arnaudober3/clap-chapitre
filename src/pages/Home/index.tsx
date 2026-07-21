import { useLocation } from 'react-router-dom';
import type { Medium } from '../../mock/types';
import { latestFor, recentFor } from '../../mock/home';
import Hero from './Hero';
import RecentAvisGrid from './RecentAvisGrid.tsx';
import Newsletter from './Newsletter';
import styles from './Home.module.css';

/** Maps a medium-filter route path to its Medium value. */
const PATH_TO_MEDIUM: Record<string, Medium> = {
  '/films': 'film',
  '/series': 'serie',
  '/livres': 'livre',
  '/docs': 'doc',
};

/**
 * Salon home feed. Resolves the active medium from the route (undefined = the
 * full mixed feed), then composes the hero (newest review), the "AvisArchives récents"
 * grid (the rest) and the newsletter band inside the shared Layout's <main>.
 * Medium navigation lives in the shared Header, not here.
 */
export default function HomePage() {
  const { pathname } = useLocation();
  const medium = PATH_TO_MEDIUM[pathname];
  const hero = latestFor(medium);
  const recent = recentFor(medium);

  return (
    <section
      className={styles.page}
      data-testid="home-page"
      data-medium={medium ?? 'all'}
    >
      {hero ? (
        <Hero item={hero} />
      ) : (
        <p className={styles.empty}>Aucun avis pour ce médium pour l’instant.</p>
      )}
      <RecentAvisGrid items={recent} medium={medium} />
      <Newsletter />
    </section>
  );
}
