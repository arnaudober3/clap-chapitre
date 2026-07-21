import type { YearStat } from '../../mock/apropos';
import styles from './APropos.module.css';

/**
 * The "Cette année" aside panel: an uppercase --faint heading then one
 * baseline-aligned row per stat (sans label left, serif --accent number
 * right). The last row carries no hairline separator. `stats: []` renders the
 * heading with no rows; a `value: 0` renders "0" (never swallowed).
 */
export default function YearStats({
  title,
  stats,
}: {
  title: string;
  stats: YearStat[];
}) {
  return (
    <section className={styles.statsCard} data-testid="year-stats">
      {title ? <p className={styles.statsTitle}>{title}</p> : null}
      {stats.map((stat, index) => (
        <div
          key={index}
          className={
            index === stats.length - 1
              ? styles.statRow
              : `${styles.statRow} ${styles.statRowDivided}`
          }
          data-testid="year-stat-row"
        >
          <span className={styles.statLabel}>{stat.label}</span>
          <span className={styles.statValue}>{String(stat.value)}</span>
        </div>
      ))}
    </section>
  );
}
