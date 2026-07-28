import styles from './Pagination.module.css';

export interface PaginationProps {
  page: number;
  pageCount: number;
  /** Rows currently on screen (the design counts the page, not the filter). */
  shown: number;
  total: number;
  /** Singular of what is being counted, e.g. "article" or "bilan". */
  noun: string;
  onPageChange: (page: number) => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * Listing pager (designs 8a / 9a): "7 articles sur 32" plus the numbered
 * controls. Renders the count alone when everything fits on one page.
 * Page-agnostic — takes only props, no page/mock imports.
 */
export default function Pagination({
  page,
  pageCount,
  shown,
  total,
  noun,
  onPageChange,
  className,
  'data-testid': testId,
}: PaginationProps) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <div
      className={className ? `${styles.pagination} ${className}` : styles.pagination}
      data-testid={testId}
    >
      <span className={styles.paginationCount}>
        {shown} {noun}
        {shown > 1 ? 's' : ''} sur {total}
      </span>
      {pageCount > 1 && (
        <nav className={styles.pager} aria-label="Pagination">
          <button
            type="button"
            className={styles.pagerStep}
            onClick={() => onPageChange(page - 1)}
            disabled={page === 1}
            aria-label="Page précédente"
          >
            ←
          </button>
          {pages.map((number) => (
            <button
              key={number}
              type="button"
              className={
                number === page ? `${styles.pagerPage} ${styles.pagerPageActive}` : styles.pagerPage
              }
              aria-current={number === page ? 'page' : undefined}
              onClick={() => onPageChange(number)}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            className={styles.pagerStep}
            onClick={() => onPageChange(page + 1)}
            disabled={page === pageCount}
            aria-label="Page suivante"
          >
            →
          </button>
        </nav>
      )}
    </div>
  );
}
