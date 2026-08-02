import type { ReactNode } from 'react';
import styles from './ui.module.css';

/**
 * Page-agnostic responsive grid. Renders its children as grid cells: 3 columns
 * on desktop, 2 on mobile (via the token breakpoints in ui.module.css), with a
 * hover-lift on interactive children. Column count is driven by CSS tokens, not
 * hard-coded to any one page. Takes only props + children — no page/mock imports.
 *
 * Cells arrive one after the other on mount (the data-anim cascade in
 * global.css), chained onto the delay the enclosing page cascade gave the grid.
 * `animate={false}` opts a grid out without the primitive knowing why.
 */
export default function CardGrid({
  children,
  className,
  animate = true,
  'data-testid': testId,
}: {
  children: ReactNode;
  className?: string;
  animate?: boolean;
  'data-testid'?: string;
}) {
  return (
    <div
      className={className ? `${styles.grid} ${className}` : styles.grid}
      data-testid={testId ?? 'card-grid'}
      data-anim={animate ? 'stagger' : undefined}
    >
      {children}
    </div>
  );
}
