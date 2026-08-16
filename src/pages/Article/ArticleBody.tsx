import { Fragment } from 'react';
import type { Article } from '../../../shared/content';
import styles from './Article.module.css';

type Block = { type: 'text'; content: string } | { type: 'quote'; content: string } | { type: 'hr' };

type Segment =
  | { text: string }
  | { text: string; bold: true }
  | { text: string; italic: true }
  | { text: string; bold: true; italic: true };

/** Split a string into non-empty, trimmed paragraphs. */
function split(source: string): string[] {
  return source
    .split('\n\n')
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph.length > 0);
}

/** Classify paragraphs into blocks (text, quote, hr). */
function classify(paragraphs: string[]): Block[] {
  return paragraphs.map((paragraph) => {
    if (/^-{3,}$/.test(paragraph)) {
      return { type: 'hr' };
    }
    if (paragraph.startsWith('> ')) {
      const lines = paragraph.split('\n').map(line => line.replace(/^> /, ''));
      return { type: 'quote', content: lines.join('\n') };
    }
    return { type: 'text', content: paragraph };
  });
}

/** Tokenize inline markdown (bold and italic). */
function tokenize(text: string): Segment[] {
  const segments: Segment[] = [];
  let lastIndex = 0;
  // Test gras+italique *** FIRST, then gras **, then italique *
  const regex = /\*\*\*(.+?)\*\*\*|\*\*(.+?)\*\*|\*(.+?)\*/g;

  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ text: text.slice(lastIndex, match.index) });
    }

    if (match[1]) {
      // Gras + italique
      segments.push({ text: match[1], bold: true, italic: true });
    } else if (match[2]) {
      // Gras
      segments.push({ text: match[2], bold: true });
    } else {
      // Italique
      segments.push({ text: match[3], italic: true });
    }

    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    segments.push({ text: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ text }];
}

/** Render segments with inline styling (bold/italic). */
function renderSegments(segments: Segment[]) {
  return segments.map((seg, idx) => {
    if ('bold' in seg && 'italic' in seg) {
      return (
        <strong key={idx}>
          <em>{seg.text}</em>
        </strong>
      );
    }
    if ('bold' in seg) {
      return (
        <strong key={idx}>{seg.text}</strong>
      );
    }
    if ('italic' in seg) {
      return (
        <em key={idx}>{seg.text}</em>
      );
    }
    return seg.text;
  });
}

/** The blocks to render for an avis, falling back to excerpt if needed. */
function blocksOf(article: Article): Block[] {
  const fromBody = split(article.body ?? '');
  const paragraphs = fromBody.length > 0 ? fromBody : split(article.excerpt);
  return classify(paragraphs);
}

/**
 * The reading column: the essay itself. The first text block is serif with an
 * `--accent` drop cap on its initial letter, the rest are sans `--body`, and
 * the pull quote (when present) sits mid-body behind a gold rule.
 *
 * A missing `body` falls back to the `excerpt` as the single lead block, so
 * the column is never empty; a missing `pullQuote` renders no blockquote at all.
 */
export default function ArticleBody({ article }: { article: Article }) {
  const blocks = blocksOf(article);

  // Find the first text block to apply drop cap styling.
  let firstTextIndex = -1;
  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'text') {
      firstTextIndex = i;
      break;
    }
  }

  // Mid-body: after the 3rd block when long enough, else at the end.
  const quoteAfter = Math.min(3, blocks.length);

  return (
    <div className={styles.body} data-testid="article-body" data-anim="stagger">
      {blocks.map((block, index) => {
        let element: JSX.Element;

        if (block.type === 'hr') {
          element = <hr key={`hr-${index}`} className={styles.divider} />;
        } else if (block.type === 'quote') {
          const segments = tokenize(block.content);
          element = (
            <blockquote
              key={`q-${index}`}
              className={styles.pullQuote}
              data-testid="article-inline-quote"
            >
              {renderSegments(segments)}
            </blockquote>
          );
        } else {
          const segments = tokenize(block.content);
          const isLead = index === firstTextIndex;

          if (isLead) {
            const firstSegment = segments[0];
            const firstChar = firstSegment.text.charAt(0);
            const firstSegmentRest = firstSegment.text.slice(1);

            // Render the rest of the first segment with formatting, then other segments
            const restOfFirst: Segment = { ...firstSegment, text: firstSegmentRest };
            const restSegments = [restOfFirst, ...segments.slice(1)];

            element = (
              <p
                key={`p-${index}`}
                className={styles.lead}
                data-testid="article-paragraph"
              >
                <span className={styles.dropCap} data-testid="drop-cap">
                  {firstChar}
                </span>
                {renderSegments(restSegments)}
              </p>
            );
          } else {
            element = (
              <p
                key={`p-${index}`}
                className={styles.paragraph}
                data-testid="article-paragraph"
              >
                {renderSegments(segments)}
              </p>
            );
          }
        }

        if (article.pullQuote && index + 1 === quoteAfter) {
          return (
            <Fragment key={`${block.type}-${index}-q`}>
              {element}
              <blockquote
                className={styles.pullQuote}
                data-testid="article-pull-quote"
              >
                {article.pullQuote}
              </blockquote>
            </Fragment>
          );
        }

        return element;
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
