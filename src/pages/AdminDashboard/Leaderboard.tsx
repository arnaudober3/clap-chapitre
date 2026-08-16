import { Link } from 'react-router-dom';
import { adminEditPath, type LeaderboardKind, type RankedEntry } from '../../content/dashboard';
import { MEDIUM_ACCENT } from '../../media';
import { frNumber } from '../../format';
import styles from './AdminDashboard.module.css';

/** Kind → accent color token: the four media, plus gold for a bilan. */
const KIND_ACCENT: Record<LeaderboardKind, string> = {
  ...MEDIUM_ACCENT,
  bilan: 'var(--gold)',
};

/**
 * "Palmarès des publications" (design 6b): ranked bar rows, each a kind chip +
 * title + view count + a proportional colored bar. On mobile the bars hide and
 * the list caps to three rows, becoming "Publications récentes" (design 6h).
 *
 * The title link is stretched over the whole row, so clicking anywhere opens the
 * editor — `entry.id` and not `entry.articleId`, which is the public link's id
 * and is absent on a bilan.
 */
export default function Leaderboard({ entries }: { entries: RankedEntry[] }) {

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitle}>Palmarès des publications</h2>
      <p className={styles.cardSubtitle}>Classées par vues</p>
      <ol className={styles.rankList} data-anim="stagger">
        {entries.map((entry) => (
          <li
            key={entry.id}
            className={styles.rankRow}
            style={{ ['--row-accent' as string]: KIND_ACCENT[entry.kind] }}
          >
            <div className={styles.rankHead}>
              <span className={styles.rankTitleWrap}>
                <span className={styles.rankChip}>{entry.kindLabel}</span>
                <Link
                  to={adminEditPath(entry.kind, entry.id)}
                  className={styles.rankTitle}
                >
                  {entry.title}
                </Link>
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
