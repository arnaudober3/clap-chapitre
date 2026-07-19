import { useState } from 'react';
import { Link } from 'react-router-dom';
import { bilans, bilansByYear, latestBilan } from '../../mock/bilans';
import { SectionHeader } from '../../components/ui';
import YearSection from './YearSection';
import styles from './Archives.module.css';

/**
 * Salon Archives page — the index of every monthly Bilan culturel, grouped by
 * year: the current (newest, first) year expanded as a grid of month cards,
 * older years collapsed. Inside the shared Layout's <main> it renders, top to
 * bottom: a "‹ Revenir au dernier bilan" back link, an eyebrow + H1 header, then
 * one YearSection per bilansByYear() entry. Expand/collapse is local React state
 * owned here (multiple years may be open at once). Empty `bilans` renders a Salon
 * empty state and omits the back link rather than dereferencing latestBilan().
 */
export default function ArchivesPage() {
  const years = bilansByYear();
  // The current (newest, first) year starts expanded; older years collapsed.
  const [openYears, setOpenYears] = useState<Set<number>>(
    () => new Set(years.length > 0 ? [years[0].year] : []),
  );

  const toggleYear = (year: number) => {
    setOpenYears((prev) => {
      const next = new Set(prev);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  if (bilans.length === 0) {
    return (
      <section className={styles.page} data-testid="archives-page">
        <SectionHeader
          eyebrow="Bilan culturel"
          heading="Tous les bilans"
          headingLevel={1}
        />
        <p className={styles.empty}>Aucun bilan archivé pour l’instant.</p>
      </section>
    );
  }

  return (
    <section className={styles.page} data-testid="archives-page">
      <Link
        to={`/bilan-culturel?mois=${latestBilan().id}`}
        className={styles.backLink}
      >
        ‹ Revenir au dernier bilan
      </Link>
      <SectionHeader
        eyebrow="Bilan culturel"
        heading="Tous les bilans"
        headingLevel={1}
      />
      <div className={styles.years}>
        {years.map(({ year, months }) => (
          <YearSection
            key={year}
            year={year}
            months={months}
            expanded={openYears.has(year)}
            onToggle={() => toggleYear(year)}
          />
        ))}
      </div>
    </section>
  );
}
