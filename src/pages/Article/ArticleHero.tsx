import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import type { Article, Medium } from '../../mock/types';
import type { MonthlyBilan } from '../../mock/bilans';
import {
  MEDIA,
  MEDIUM_ACCENT,
  MEDIUM_LABEL,
  MEDIUM_TO_SEGMENT,
} from '../../media';
import styles from './Article.module.css';

/** Plural archive label ("Films", "Séries", …) — the breadcrumb's medium crumb. */
function archiveLabel(medium: Medium): string {
  return MEDIA.find((entry) => entry.medium === medium)?.label ?? '';
}

/**
 * The article header: the derived breadcrumb plus the hero itself.
 *
 * Desktop (design 4a) is a 250px gradient cover beside the medium eyebrow +
 * genre meta line, the H1, the italic hook and the byline. Mobile (design 4b)
 * repaints the same DOM as a full-bleed cover band (back link, poster thumb,
 * eyebrow and title in white) with the hook + byline below on `--bg`. The swap
 * is CSS-only — one `<h1>`, no window-width JS.
 *
 * Missing optional data degrades: no `genreMeta` drops the meta line and its
 * dot, no `hook` drops the italic line, no `readingTime` leaves the date alone
 * with no dangling separator.
 */
export default function ArticleHero({
  article,
  bilan,
}: {
  article: Article;
  bilan?: MonthlyBilan;
}) {
  const archiveHref = `/archives/${MEDIUM_TO_SEGMENT[article.medium]}`;
  // The mobile back link targets the same place as the second desktop crumb —
  // the owning month, or the medium archive for a feed-only avis.
  const backHref = bilan ? `/bilan-culturel?mois=${bilan.id}` : archiveHref;
  const backLabel = bilan
    ? `${bilan.monthLabel} ${bilan.year}`
    : archiveLabel(article.medium);

  return (
    <header className={styles.hero} data-testid="article-hero">
      <nav className={styles.breadcrumb} aria-label="Fil d’Ariane">
        {bilan ? (
          <>
            <Link className={styles.crumbLead} to="/bilan-culturel">
              Bilan culturel
            </Link>
            <span className={styles.crumbSep} aria-hidden="true">
              ›
            </span>
            <Link className={styles.crumbLink} to={backHref}>
              {bilan.monthLabel} {bilan.year}
            </Link>
            <span className={styles.crumbSep} aria-hidden="true">
              ›
            </span>
            <span className={styles.crumbCurrent}>
              {archiveLabel(article.medium)}
            </span>
          </>
        ) : (
          <Link className={styles.crumbLead} to={archiveHref}>
            {archiveLabel(article.medium)}
          </Link>
        )}
      </nav>

      <div className={styles.heroMain}>
        {/* `.band` is a real painted band on mobile and `display: contents` on
            desktop, so cover / headline become grid items of `.heroMain`. */}
        <div className={styles.band} style={{ background: article.cover }}>
          <Link className={styles.backLink} to={backHref}>
            ‹ {backLabel}
          </Link>

          <div
            className={styles.cover}
            style={{ background: article.cover }}
            data-testid="article-cover"
          >
            <span className={styles.coverEyebrow}>Affiche</span>
            <span className={styles.coverTitle} aria-hidden="true">
              {article.title}
            </span>
          </div>

          <div className={styles.headline}>
            <p className={styles.metaRow}>
              <span
                className={styles.mediumLabel}
                style={
                  {
                    '--medium-accent': MEDIUM_ACCENT[article.medium],
                  } as CSSProperties
                }
              >
                {MEDIUM_LABEL[article.medium]}
              </span>
              {article.genreMeta ? (
                <>
                  <span className={styles.metaDot} aria-hidden="true">
                    ·
                  </span>
                  <span className={styles.genreMeta}>{article.genreMeta}</span>
                </>
              ) : null}
            </p>
            <h1 className={styles.title}>{article.title}</h1>
          </div>
        </div>

        <div className={styles.heroFoot}>
          {article.hook ? <p className={styles.hook}>{article.hook}</p> : null}
          <div className={styles.byline}>
            <span className={styles.avatar} aria-hidden="true">
              MZ
            </span>
            <span className={styles.bylineText}>
              <span className={styles.bylineAuthor}>
                par <strong>{article.author}</strong>
              </span>
              <span className={styles.bylineDate}>
                Publié le {article.date}
                {article.readingTime ? ` · ${article.readingTime}` : ''}
              </span>
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
