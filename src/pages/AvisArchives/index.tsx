import { useState } from 'react';
import type { Medium } from '../../mock/types';
import { feed } from '../../mock/home';
import { SectionHeader, ReviewCard } from '../../components/ui';
import styles from './AvisArchives.module.css';

/** The filter row: "Tous" plus one pill per medium (plural labels). */
const FILTERS: Array<{ key: Medium | 'all'; label: string }> = [
  { key: 'all', label: 'Tous' },
  { key: 'film', label: 'Films' },
  { key: 'serie', label: 'Séries' },
  { key: 'livre', label: 'Livres' },
  { key: 'doc', label: 'Docs' },
];

/**
 * The "Tous les avis" archive — the full index of individual reviews (Home's
 * "Tout voir" target), distinct from the bilan-culturel archive at /archives.
 * Renders every avis (newest first) as the shared ReviewCard, with a medium
 * filter row that narrows the list. Filtering is local React state; "Tous"
 * shows the whole feed. A filter with no matches shows a Salon empty state.
 */
export default function AvisArchivesPage() {
  const [active, setActive] = useState<Medium | 'all'>('all');
  const items =
    active === 'all' ? feed : feed.filter((item) => item.medium === active);

  return (
    <section className={styles.page} data-testid="avis-archives-page" data-medium={active}>
      <SectionHeader
        eyebrow="Avis récents"
        heading="Tous les avis"
        headingLevel={1}
      />

      <div className={styles.filters} role="group" aria-label="Filtrer par média">
        {FILTERS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`${styles.filter} ${
              active === key ? styles.filterActive : ''
            }`}
            aria-pressed={active === key}
            onClick={() => setActive(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className={styles.empty}>Aucun avis pour ce média pour l’instant.</p>
      ) : (
        <div className={styles.grid} data-testid="avis-grid">
          {items.map((item) => (
            <ReviewCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}