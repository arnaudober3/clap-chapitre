import { useLocation } from 'react-router-dom';
import type { Medium } from '../../mock/types';

/** Maps a medium-filter route path to its Medium value. */
const PATH_TO_MEDIUM: Record<string, Medium> = {
  '/films': 'film',
  '/series': 'serie',
  '/livres': 'livre',
  '/docs': 'doc',
};

const MEDIUM_LABEL: Record<Medium, string> = {
  film: 'Films',
  serie: 'Séries',
  livre: 'Livres',
  doc: 'Docs',
};

/**
 * Home feed placeholder. Reads the active medium from the route so subtask 02
 * can wire real filtering; no real feed content yet.
 */
export default function HomePage() {
  const { pathname } = useLocation();
  const medium = PATH_TO_MEDIUM[pathname];

  return (
    <section data-testid="home-page" data-medium={medium ?? 'all'}>
      <h1>Avis récents</h1>
      <p>
        {medium
          ? `Filtre actif : ${MEDIUM_LABEL[medium]}`
          : 'Tous les avis, tous médias confondus.'}
      </p>
    </section>
  );
}
