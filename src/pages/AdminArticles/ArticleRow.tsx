import { Link } from 'react-router-dom';
import type { Article } from '../../mock/types';
import { MEDIUM_ACCENT, MEDIUM_CHIP_LABEL } from '../../media';
import { frNumber, shortDate } from '../../format';
import styles from './AdminArticles.module.css';

/** Placeholder for the figures a draft doesn't have yet. */
const EMPTY = '—';

/**
 * One catalogue entry. A single DOM serves both designs: a dense grid row at lg
 * (8a) and a stacked card below it (8b) — the `metaGroup` / `statsGroup`
 * wrappers collapse via `display: contents` on desktop so their children join
 * the row grid directly. The title link is stretched over the whole row, so
 * clicking anywhere opens the editor; a draft row is highlighted, drops its
 * figures, and shows its "Modifié…" line instead of the hook.
 */
export default function ArticleRow({ item }: { item: Article }) {
  const draft = item.status === 'draft';

  return (
    <li
      className={draft ? `${styles.row} ${styles.rowDraft}` : styles.row}
      style={{ ['--row-accent' as string]: MEDIUM_ACCENT[item.medium] }}
      data-testid="admin-article-row"
    >
      <span className={styles.stripe} aria-hidden="true" />

      <span className={styles.titleCell}>
        <Link to={`/admin/articles/${item.id}`} className={styles.rowTitle}>
          {item.title}
        </Link>
        <span className={styles.rowSub}>
          {draft ? item.updatedLabel : (item.hook ?? item.excerpt)}
        </span>
      </span>

      <span className={styles.metaGroup}>
        <span className={styles.mediumCell}>
          <span className={styles.chip}>{MEDIUM_CHIP_LABEL[item.medium]}</span>
        </span>
        <span className={draft ? `${styles.dateCell} ${styles.dateEmpty}` : styles.dateCell}>
          {item.status === 'draft' ? EMPTY : shortDate(item.publishedAt)}
        </span>
      </span>

      <span className={styles.statsGroup}>
        {/* A draft's placeholders stay quiet — the views emphasis would only
            make an em dash shout. */}
        <span
          className={
            draft
              ? `${styles.numberCell} ${styles.cellEmpty}`
              : `${styles.numberCell} ${styles.viewsCell}`
          }
        >
          {draft ? EMPTY : frNumber(item.views)}
          <span className={styles.cellUnit}> vues</span>
        </span>
        <span className={styles.numberCell}>
          <span className={styles.cellUnit} aria-hidden="true">
            ♥{' '}
          </span>
          {draft ? EMPTY : frNumber(item.likes)}
        </span>
        <span className={styles.numberCell}>
          {draft ? EMPTY : frNumber(item.comments)}
          <span className={styles.cellUnit}> comm.</span>
        </span>
      </span>

      <span className={styles.statusCell}>
        <span className={draft ? `${styles.pill} ${styles.pillDraft}` : styles.pill}>
          {draft ? 'Brouillon' : 'Publié'}
        </span>
      </span>
    </li>
  );
}
