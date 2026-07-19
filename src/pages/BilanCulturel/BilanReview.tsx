import type { Article, Medium } from '../../mock/types';
import styles from './BilanCulturel.module.css';

const MEDIUM_LABEL: Record<Medium, string> = {
  film: 'Film',
  serie: 'Série',
  livre: 'Livre',
  doc: 'Doc',
};

/** Maps a medium to its accent color token for the review label. */
const MEDIUM_ACCENT: Record<Medium, string> = {
  film: 'var(--medium-film)',
  serie: 'var(--medium-serie)',
  livre: 'var(--medium-livre)',
  doc: 'var(--medium-docs)',
};

/** Splits body copy into paragraphs on blank lines. */
function paragraphs(body: string): string[] {
  return body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

/**
 * A single review inside a Bilan month: the gradient cover (2/3, title
 * overlaid) beside the body — colored medium label, serif H2 title, optional
 * italic hook, the body split into paragraphs, an optional "À rapprocher de"
 * callout (from `relatedTo`) and an optional "Pour ceux qui…" box (from
 * `forThoseWho`). Each optional element is omitted without error when absent.
 */
export default function BilanReview({ item }: { item: Article }) {
  return (
    <article className={styles.review}>
      <div
        className={styles.reviewCover}
        style={{ background: item.cover }}
      >
        <span className={styles.reviewCoverTitle}>{item.title}</span>
      </div>
      <div className={styles.reviewBody}>
        <span
          className={styles.reviewMedium}
          style={{ color: MEDIUM_ACCENT[item.medium] }}
        >
          {MEDIUM_LABEL[item.medium]}
        </span>
        <h2 className={styles.reviewTitle}>{item.title}</h2>
        {item.hook ? <p className={styles.reviewHook}>{item.hook}</p> : null}
        {item.body
          ? paragraphs(item.body).map((paragraph, index) => (
              <p key={index} className={styles.reviewParagraph}>
                {paragraph}
              </p>
            ))
          : null}
        {item.relatedTo ? (
          <aside className={styles.relatedTo}>
            <span className={styles.relatedToLabel}>À rapprocher de</span>
            <p className={styles.relatedToText}>
              <b className={styles.relatedToTitle}>{item.relatedTo.title}</b> —{' '}
              <span className={styles.relatedToNote}>{item.relatedTo.note}</span>
            </p>
          </aside>
        ) : null}
        {item.forThoseWho ? (
          <p className={styles.forThoseWho}>{item.forThoseWho}</p>
        ) : null}
      </div>
    </article>
  );
}
