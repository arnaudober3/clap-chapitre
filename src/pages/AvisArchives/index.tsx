import { Link, Navigate, useParams } from 'react-router-dom';
import { feed } from '../../mock/home';
import { MEDIA, SEGMENT_TO_MEDIUM, DEFAULT_SEGMENT } from '../../media';
import { SectionHeader, ReviewCard } from '../../components/ui';
import styles from './AvisArchives.module.css';

/**
 * The "Tous les avis" archive — the full index of individual reviews (Home's
 * "Tout voir" target), always filtered to a single medium taken from the route
 * (`/archives/<segment>`, e.g. /archives/films), like the home medium feeds.
 * The tab row links to the sibling media; there is no "all" view. An unknown
 * segment redirects to the default medium; a medium with no avis shows a Salon
 * empty state.
 */
export default function AvisArchivesPage() {
  const { medium: segment } = useParams();
  const medium = segment ? SEGMENT_TO_MEDIUM[segment] : undefined;

  // Unknown/missing segment → canonical default medium, never a blank page.
  if (!medium) return <Navigate to={`/archives/${DEFAULT_SEGMENT}`} replace />;

  const items = feed.filter((item) => item.medium === medium);

  return (
    <section
      className={styles.page}
      data-testid="avis-archives-page"
      data-medium={medium}
      data-anim="stagger"
    >
      <SectionHeader
        eyebrow="Avis récents"
        heading="Tous les avis"
        headingLevel={1}
      />

      <nav className={styles.filters} aria-label="Filtrer par média">
        {MEDIA.map(({ medium: m, segment: seg, label }) => (
          <Link
            key={m}
            to={`/archives/${seg}`}
            className={`${styles.filter} ${
              m === medium ? styles.filterActive : ''
            }`}
            aria-current={m === medium ? 'page' : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>

      {items.length === 0 ? (
        <p className={styles.empty}>Aucun avis pour ce média pour l’instant.</p>
      ) : (
        <div className={styles.grid} data-testid="avis-grid" data-anim="stagger">
          {items.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}