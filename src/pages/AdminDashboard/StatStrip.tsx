import { kpis } from '../../mock/dashboard';
import { frNumber } from '../../format';
import styles from './AdminDashboard.module.css';

/**
 * The KPI band (design 6b): one white card split into four cells (Vues / Likes /
 * Commentaires / Partages), each an uppercase label, a serif value and a green
 * delta. Collapses to a 2×2 grid on mobile (design 6h).
 */
export default function StatStrip({ period }: { period?: string }) {
  return (
    <div className={styles.statStrip}>
      {kpis(period).map((stat) => {
        const down = stat.deltaPct < 0;
        return (
          <div key={stat.key} className={styles.statCell}>
            <div className={styles.statLabel}>{stat.label}</div>
            <div className={styles.statValueRow}>
              <span className={styles.statValue}>{frNumber(stat.value)}</span>
              <span className={`${styles.statDelta} ${down ? styles.negative : ''}`}>
                {down ? '↓' : '↑'}
                {Math.abs(stat.deltaPct)}%
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
