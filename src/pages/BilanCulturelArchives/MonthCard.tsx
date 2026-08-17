import { Link } from "react-router-dom";
import type { BilanSummary } from "../../api/content";
import { PosterThumb } from "../../components/ui";
import styles from "./BilanCulturelArchives.module.css";

/**
 * An archive month card: a bordered --surface card whose top is a collage of up
 * to 3 gradient PosterThumb tiles, and whose body is the serif monthLabel, an
 * `N avis` count, and — only when isLatest — a "dernier" pill. The whole card
 * deep-links to the bilan (`/bilan-culturel?mois=<id>`), not to an article. A
 * month with fewer than 3 avis renders only the covers available; 0 avis renders
 * no thumbnails.
 *
 * The covers and the count come from the listing endpoint rather than from the
 * month's avis: the archive shows fifteen months, and loading every avis of
 * every one of them to render three squares and a number would be the whole
 * catalogue for one screen.
 */
export default function MonthCard({
  bilan,
  isLatest = false,
}: {
  bilan: BilanSummary;
  isLatest?: boolean;
  key?: string;
}) {
  const covers = bilan.covers;

  return (
    <Link
      to={`/bilan-culturel?mois=${bilan.id}`}
      className={styles.monthCard}
      data-testid="month-card"
    >
      {covers.length > 0 && (
        <div className={styles.collage} data-testid="month-card-collage">
          {covers.map((cover, index) => (
            <PosterThumb
              // The covers are gradients, not entities: two avis can legitimately
              // share one, so the position is the only stable key here.
              key={index}
              cover={cover}
              className={styles.collageTile}
            />
          ))}
        </div>
      )}
      <div className={styles.monthCardBody}>
        <div className={styles.monthCardTitleRow}>
          <h3 className={styles.monthCardTitle}>{bilan.monthLabel}</h3>
          {isLatest && (
            <span className={styles.dernierPill} data-testid="dernier-pill">
              dernier
            </span>
          )}
        </div>
        <p className={styles.monthCardCount}>{bilan.avisCount} avis</p>
      </div>
    </Link>
  );
}
