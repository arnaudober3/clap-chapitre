import { Link, Navigate, useParams } from 'react-router-dom';
import type { Medium } from '../../../shared/content';
import { useArticleList } from '../../api/content';
import { MEDIA, SEGMENT_TO_MEDIUM, MEDIUM_TO_SEGMENT, DEFAULT_SEGMENT } from '../../media';
import { PageError, PageLoading, SectionHeader, ReviewCard } from '../../components/ui';
import { Seo } from '../../seo/Seo';
import { ARCHIVE_SEO } from '../../seo/staticCopy';
import { breadcrumbSchema } from '../../seo/schema';
import styles from './AvisArchives.module.css';

/**
 * One request covers the archive: no pager is in the design, so the page asks
 * for a wide slice rather than inventing one. `total` says whether that was
 * enough, which is what would trigger adding a pager here.
 */
const PER_PAGE = 100;

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
  // Resolved before the archive is mounted, so the fetch below is never started
  // for a medium that does not exist.
  if (!medium) return <Navigate to={`/archives/${DEFAULT_SEGMENT}`} replace />;

  return <MediumArchive medium={medium} />;
}

function MediumArchive({ medium }: { medium: Medium }) {
  const { data, status, reload } = useArticleList(medium, 1, PER_PAGE);
  const items = data?.items ?? [];
  const seo = ARCHIVE_SEO[medium];
  const path = `/archives/${MEDIUM_TO_SEGMENT[medium]}`;
  const jsonLd = breadcrumbSchema([
    { name: 'Accueil', path: '/films' },
    { name: seo.title, path },
  ]);

  return (
    <section
      className={styles.page}
      data-testid="avis-archives-page"
      data-medium={medium}
      data-anim="stagger"
    >
      <Seo title={seo.title} description={seo.description} path={path} jsonLd={jsonLd} />
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

      {status === 'loading' && <PageLoading />}
      {status === 'error' && <PageError onRetry={reload} />}
      {status === 'ready' &&
        (items.length === 0 ? (
          <p className={styles.empty}>Aucun avis pour ce média pour l’instant.</p>
        ) : (
          <div className={styles.grid} data-testid="avis-grid" data-anim="stagger">
            {items.map((item) => (
              <ReviewCard key={item.id} item={item} />
            ))}
          </div>
        ))}
    </section>
  );
}
