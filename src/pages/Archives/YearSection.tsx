import type { MonthlyBilan } from '../../mock/bilans';
import { latestBilan } from '../../mock/bilans';
import { CardGrid } from '../../components/ui';
import MonthCard from './MonthCard';
import styles from './Archives.module.css';

/**
 * One year in the Archives index. The year header is a real <button> with
 * aria-expanded reflecting `expanded`: the year (serif when expanded, --muted-2
 * when collapsed), a `N bilans` count and a caret (▾ expanded / ▸ collapsed).
 * When expanded it renders one MonthCard per month inside the shared CardGrid,
 * flagging the month whose id matches latestBilan() as "dernier"; when collapsed
 * it renders only the header row. Holds no expand state itself — the page (AR-4)
 * owns state and passes `expanded` + `onToggle`.
 */
export default function YearSection({
  year,
  months,
  expanded,
  onToggle,
}: {
  year: number;
  months: MonthlyBilan[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const latestId = latestBilan()?.id;

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
