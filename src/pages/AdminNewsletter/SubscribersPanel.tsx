import { frNumber, signedNumber } from '../../format';
import type { SendRecord, SubscriberStats } from '../../mock/newsletter';
import styles from './AdminNewsletter.module.css';

/**
 * The "Abonnés" card (design 6e): the audience at a glance, then the editions
 * already mailed with their open rate. Both lists come from the page, which is
 * the one place that reads the mock: `sends` so an edition mailed during the
 * session leads the list (React state only, nothing is written back).
 */
export default function SubscribersPanel({
  stats,
  sends,
}: {
  stats: SubscriberStats;
  sends: SendRecord[];
}) {
  // A month can lose more subscribers than it gains, so the delta carries its
  // own sign and reads terracotta when it does — same code as the dashboard KPIs.
  const deltaTone =
    stats.monthDelta > 0
      ? styles.statValuePositive
      : stats.monthDelta < 0
        ? styles.statValueNegative
        : '';

  return (
    <section className={styles.card} data-testid="newsletter-subscribers-panel">
      <p className={styles.cardLabel}>Abonnés</p>

      <div className={styles.stats}>
        <div className={styles.stat}>
          <div className={styles.statValue}>{frNumber(stats.total)}</div>
          <div className={styles.statLabel}>Total</div>
        </div>
        <div className={styles.stat}>
          <div
            className={deltaTone ? `${styles.statValue} ${deltaTone}` : styles.statValue}
          >
            {signedNumber(stats.monthDelta)}
          </div>
          <div className={styles.statLabel}>ce mois</div>
        </div>
        <div className={styles.stat}>
          {/* The mean across every edition ever mailed — see SubscriberStats.
              The rows below carry each send's own rate instead. */}
          <div className={styles.statValue}>{stats.openRatePct}%</div>
          <div className={styles.statLabel}>ouverture</div>
        </div>
      </div>

      <p className={`${styles.cardLabel} ${styles.sendsLabel}`}>Derniers envois</p>
      <ul className={styles.sends} data-testid="newsletter-sends">
        {sends.map((send) => (
          <li key={send.id} className={styles.sendRow}>
            <span>{send.title}</span>
            <span className={styles.sendMeta}>
              {send.openRatePct === undefined
                ? send.dateLabel
                : `${send.dateLabel} · ${send.openRatePct}%`}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
