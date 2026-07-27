import styles from './AdminArticles.module.css';

/**
 * Listing pager (design 8a): "7 articles sur 32" plus the numbered controls.
 * Renders nothing when everything fits on one page.
 */
export default function Pagination({
  page,
  pageCount,
  shown,
  total,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  /** Rows currently on screen (the design counts the page, not the filter). */
  shown: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const pages = Array.from({ length: pageCount }, (_, index) => index + 1);

  return (
    <div className={styles.pagination}>
      <span className={styles.paginationCount}>
        {shown} article{shown > 1 ? 's' : ''} sur {total}
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
