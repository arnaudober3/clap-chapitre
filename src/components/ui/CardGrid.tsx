import type { ReactNode } from 'react';
import styles from './ui.module.css';

/**
 * Page-agnostic responsive grid. Renders its children as grid cells: 3 columns
 * on desktop, 2 on mobile (via the token breakpoints in ui.module.css), with a
 * hover-lift on interactive children. Column count is driven by CSS tokens, not
 * hard-coded to any one page. Takes only props + children — no page/mock imports.
 */
export default function CardGrid({
  children,
  className,
  'data-testid': testId,
}: {
  children: ReactNode;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <div
      className={className ? `${styles.grid} ${className}` : styles.grid}
      data-testid={testId ?? 'card-grid'}
    >
      {children}
    </div>
  );
}
