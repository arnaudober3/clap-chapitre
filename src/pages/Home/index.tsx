import { useLocation } from 'react-router-dom';
import type { Medium } from '../../../shared/content';
import { useFeed } from '../../api/content';
import { PageError, PageLoading } from '../../components/ui';
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
 *
 * The hero/grid split is made here rather than by the endpoint: `/api/feed`
 * returns the medium's newest avis in order, and which one gets the large
 * treatment is a layout decision.
 *
 * The newsletter band renders in every state, empty database included — it is
 * standing copy, not content, and a page that loses it while loading would jump.
 */
export default function HomePage() {
  const { pathname } = useLocation();
  const medium = PATH_TO_MEDIUM[pathname];
  const { data, status, reload } = useFeed(medium);

  const [hero, ...recent] = data ?? [];

  return (
    <section
      className={styles.page}
      data-testid="home-page"
      data-medium={medium ?? 'all'}
      data-anim="stagger"
    >
      {status === 'loading' && <PageLoading />}
      {status === 'error' && <PageError onRetry={reload} />}
      {status === 'ready' &&
        (hero ? (
          <Hero item={hero} />
        ) : (
          <p className={styles.empty}>Aucun avis pour ce médium pour l’instant.</p>
        ))}
      {recent.length > 0 && <RecentAvisGrid items={recent} medium={medium} />}
      <Newsletter />
    </section>
  );
}
