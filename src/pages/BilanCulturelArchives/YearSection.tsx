import type { BilanSummary } from '../../api/content';
import { CardGrid } from '../../components/ui';
import MonthCard from './MonthCard';
import styles from './BilanCulturelArchives.module.css';

/**
 * One year in the BilanCulturelArchives index. The year header is a real <button> with
 * aria-expanded reflecting `expanded`: the year (serif when expanded, --muted-2
 * when collapsed), a `N bilans` count and a caret (▾ expanded / ▸ collapsed).
 * When expanded it renders one MonthCard per month inside the shared CardGrid,
 * flagging the month whose id matches `latestId` as "dernier"; when collapsed
 * it renders only the header row. Holds no expand state itself — the page (AR-4)
 * owns state and passes `expanded` + `onToggle`.
 */
export default function YearSection({
  year,
  months,
  latestId,
  expanded,
  onToggle,
}: {
  year: number;
  months: BilanSummary[];
  /** The newest month overall, which wears the "dernier" badge. */
  latestId?: string;
  expanded: boolean;
  onToggle: () => void;
}) {

  return (
    <section className={styles.yearSection} data-testid="year-section">
      <button
        type="button"
        className={`${styles.yearHeader} ${
          expanded ? styles.yearHeaderExpanded : styles.yearHeaderCollapsed
        }`}
        aria-expanded={expanded}
        onClick={onToggle}
        data-testid="year-header"
      >
        <span
          className={`${styles.yearLabel} ${
            expanded ? '' : styles.yearLabelCollapsed
          }`}
        >
          {year}
        </span>
        <span className={styles.yearCount}>{months.length} bilans</span>
        <span className={styles.yearCaret} aria-hidden="true">
          {expanded ? '▾' : '▸'}
        </span>
      </button>
      {expanded && (
        <CardGrid data-testid="year-grid">
          {months.map((month) => (
            <MonthCard
              key={month.id}
              bilan={month}
              isLatest={month.id === latestId}
            />
          ))}
        </CardGrid>
      )}
    </section>
  );
}
