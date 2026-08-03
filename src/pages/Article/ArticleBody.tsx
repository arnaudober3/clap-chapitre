import { Fragment } from 'react';
import type { Article } from '../../../shared/content';
import styles from './Article.module.css';

/** Split a string into non-empty, trimmed paragraphs. */
function split(source: string): string[] {
  return source
    .split('\n\n')
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/** The paragraphs to render for an avis. */
function paragraphsOf(article: Article): string[] {
  // A body that is missing — or present but empty / whitespace only — falls
  // back to the excerpt, so the column is never empty.
  const fromBody = split(article.body ?? '');
  return fromBody.length > 0 ? fromBody : split(article.excerpt);
}

/**
 * The reading column: the essay itself. The first paragraph is serif with an
 * `--accent` drop cap on its initial letter, the rest are sans `--body`, and
 * the pull quote (when present) sits mid-body behind a gold rule.
 *
 * A missing `body` falls back to the `excerpt` as the single lead paragraph, so
 * the column is never empty; a missing `pullQuote` renders no blockquote at all.
 */
export default function ArticleBody({ article }: { article: Article }) {
  const paragraphs = paragraphsOf(article);
  // Mid-body, per design 4a: after the third paragraph when the essay is long
  // enough, otherwise at the end of what there is.
  const quoteAfter = Math.min(3, paragraphs.length);

  return (
    <div className={styles.body} data-testid="article-body">
      {paragraphs.map((paragraph, index) => {
        const isLead = index === 0;
        const block = isLead ? (
          <p
            key={`p-${index}`}
            className={styles.lead}
            data-testid="article-paragraph"
          >
            <span className={styles.dropCap} data-testid="drop-cap">
              {paragraph.charAt(0)}
            </span>
            {paragraph.slice(1)}
          </p>
        ) : (
          <p
            key={`p-${index}`}
            className={styles.paragraph}
            data-testid="article-paragraph"
          >
            {paragraph}
          </p>
        );

        if (article.pullQuote && index + 1 === quoteAfter) {
          return (
            <Fragment key={`p-${index}-q`}>
              {block}
              <blockquote
                className={styles.pullQuote}
                data-testid="article-pull-quote"
              >
                {article.pullQuote}
              </blockquote>
            </Fragment>
          );
        }
        return block;
      })}
    </div>
  );
}

/**
 * The "Pour ceux qui…" verdict panel. Renders nothing when the avis carries no
 * `forThoseWho` line.
 */
export function ForThoseWho({ article }: { article: Article }) {
  if (!article.forThoseWho) return null;
  return (
    <aside className={styles.verdict} data-testid="article-for-those-who">
      <p className={styles.verdictEyebrow}>Pour ceux qui…</p>
      <p className={styles.verdictText}>{article.forThoseWho}</p>
    </aside>
  );
}
