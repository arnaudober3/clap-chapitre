import { leaderboardRanked, type LeaderboardKind } from '../../mock/dashboard';
import { frNumber } from '../../format';
import styles from './AdminDashboard.module.css';

/** Kind → accent color token (mirrors MEDIUM_ACCENT in ReviewCard); bilan = gold. */
const KIND_ACCENT: Record<LeaderboardKind, string> = {
  bilan: 'var(--gold)',
  film: 'var(--medium-film)',
  serie: 'var(--medium-serie)',
  livre: 'var(--medium-livre)',
  doc: 'var(--medium-docs)',
};

/**
 * "Palmarès des publications" (design 6b): ranked bar rows, each a kind chip +
 * title + view count + a proportional colored bar. On mobile the bars hide and
 * the list caps to three rows, becoming "Publications récentes" (design 6h).
 */
export default function Leaderboard() {
  const entries = leaderboardRanked();

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Palmarès des publications</h2>
      <p className={styles.cardSubtitle}>Classées par vues</p>
      <ol className={styles.rankList}>
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={styles.rankRow}
            style={{ ['--row-accent' as string]: KIND_ACCENT[entry.kind] }}
          >
            <div className={styles.rankHead}>
              <span className={styles.rankTitleWrap}>
                <span className={styles.rankChip}>{entry.kindLabel}</span>
                <span className={styles.rankTitle}>{entry.title}</span>
              </span>
              <span className={styles.rankViews}>{frNumber(entry.views)}</span>
            </div>
            <div className={styles.rankTrack}>
              <div
                className={styles.rankBar}
                style={{ width: `${Math.round(entry.ratio * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
