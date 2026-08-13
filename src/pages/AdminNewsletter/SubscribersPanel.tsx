import { frNumber, signedNumber } from '../../format';
import type { NewsletterSendRecord, NewsletterStats } from '../../api/admin';
import { instantLabel } from '../../newsletter';
import styles from './AdminNewsletter.module.css';

/**
 * The "Abonnés" card: the audience at a glance, then the editions already
 * mailed. No open rate — the site does not track opens (no tracking pixel),
 * so there is nothing to show there.
 */
export default function SubscribersPanel({
  stats,
  sends,
}: {
  stats: NewsletterStats;
  sends: NewsletterSendRecord[];
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
      </div>

      <p className={`${styles.cardLabel} ${styles.sendsLabel}`}>Derniers envois</p>
      <ul className={styles.sends} data-testid="newsletter-sends">
        {sends.length === 0 && (
          <li className={styles.sendRow}>
            <span>Aucun envoi pour l'instant.</span>
          </li>
        )}
        {sends.map((send) => (
          <li key={send.id} className={styles.sendRow}>
            <span>{send.title}</span>
            <span className={styles.sendMeta}>{instantLabel(send.sentAt)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
