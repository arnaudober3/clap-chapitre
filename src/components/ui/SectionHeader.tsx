import type { ReactNode } from 'react';
import styles from './ui.module.css';

/**
 * The Salon section header: an optional uppercase --accent eyebrow, an optional
 * serif heading, an optional trailing slot (a count, a link…) and a hairline
 * rule. Omitting any slot renders no empty element and never throws.
 * Page-agnostic — takes only props + children.
 */
export default function SectionHeader({
  eyebrow,
  heading,
  trailing,
  headingLevel = 2,
  className,
  'data-testid': testId,
}: {
  eyebrow?: ReactNode;
  heading?: ReactNode;
  trailing?: ReactNode;
  /** Heading level for the serif heading (defaults to <h2>). */
  headingLevel?: 1 | 2 | 3;
  className?: string;
  'data-testid'?: string;
}) {
  const Heading = `h${headingLevel}` as 'h1' | 'h2' | 'h3';
  return (
    <div
      className={className ? `${styles.header} ${className}` : styles.header}
      data-testid={testId ?? 'section-header'}
    >
      {eyebrow != null && eyebrow !== '' && (
        <p className={styles.eyebrow}>{eyebrow}</p>
      )}
      <div className={styles.headerRow}>
        {heading != null && heading !== '' && (
          <Heading className={styles.heading}>{heading}</Heading>
        )}
        <span className={styles.rule} aria-hidden="true" />
        {trailing != null && trailing !== '' && (
          <span className={styles.trailing}>{trailing}</span>
        )}
      </div>
    </div>
  );
}
