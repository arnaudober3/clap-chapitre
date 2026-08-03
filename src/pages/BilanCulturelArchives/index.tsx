import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useBilanList, type BilanSummary } from '../../api/content';
import { PageError, PageLoading, SectionHeader } from '../../components/ui';
import YearSection from './YearSection';
import styles from './BilanCulturelArchives.module.css';

/**
 * Bilan culturel archives — the index of every monthly bilan, grouped by year:
 * the newest year expanded as a grid of month cards, older years collapsed.
 * Inside the shared Layout's <main>, top to bottom: a "‹ Revenir au dernier
 * bilan" back link, an eyebrow + H1 header, then one YearSection per year.
 *
 * Expand/collapse is local state. An empty archive renders the Salon empty state
 * and omits the back link — there is no last bilan to return to.
 */
export default function BilanCulturelArchivesPage() {
  const { data, status, reload } = useBilanList();
  const months = useMemo(() => data ?? [], [data]);

  // The endpoint returns months newest-first; the grouping is presentation, so
  // it stays here rather than shaping the response.
  const years = useMemo(() => groupByYear(months), [months]);

  // Which years are open. It starts empty rather than holding the newest year,
  // because at first render there is no list yet — the default is applied below
  // instead, where the data is known.
  const [openYears, setOpenYears] = useState<Set<number>>(() => new Set());
  const newestYear = years[0]?.year;
  const isOpen = (year: number) =>
    openYears.size === 0 ? year === newestYear : openYears.has(year);

  const toggleYear = (year: number) => {
    setOpenYears((previous) => {
      // The first click materialises that implicit default, so collapsing the
      // newest year does not silently re-expand it.
      const next = new Set(previous.size === 0 && newestYear ? [newestYear] : previous);
      if (next.has(year)) next.delete(year);
      else next.add(year);
      return next;
    });
  };

  const header = (
    <SectionHeader eyebrow="Bilan culturel" heading="Tous les bilans" headingLevel={1} />
  );

  if (status === 'loading' || status === 'idle') {
    return (
      <section className={styles.page} data-testid="bilan-culturel-archives-page">
        {header}
        <PageLoading />
      </section>
    );
  }

  if (status === 'error') {
    return (
      <section className={styles.page} data-testid="bilan-culturel-archives-page">
        {header}
        <PageError onRetry={reload} />
      </section>
    );
  }

  if (months.length === 0) {
    return (
      <section className={styles.page} data-testid="bilan-culturel-archives-page">
        {header}
        <p className={styles.empty}>Aucun bilan archivé pour l’instant.</p>
      </section>
    );
  }

  return (
    <section className={styles.page} data-testid="bilan-culturel-archives-page">
      <Link to={`/bilan-culturel?mois=${months[0].id}`} className={styles.backLink}>
        ‹ Revenir au dernier bilan
      </Link>
      {header}
      <div className={styles.years}>
        {years.map(({ year, months: yearMonths }) => (
          <YearSection
            key={year}
            year={year}
            months={yearMonths}
            latestId={months[0].id}
            expanded={isOpen(year)}
            onToggle={() => toggleYear(year)}
          />
        ))}
      </div>
    </section>
  );
}

/** Years newest-first, months within a year newest-first. */
function groupByYear(months: BilanSummary[]): Array<{ year: number; months: BilanSummary[] }> {
  const byYear = new Map<number, BilanSummary[]>();
  for (const month of months) {
    const entry = byYear.get(month.year) ?? [];
    entry.push(month);
    byYear.set(month.year, entry);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, entries]) => ({
      year,
      months: [...entries].sort((a, b) => b.month - a.month),
    }));
}
