import styles from './ui.module.css';
import { CONTENT_ERROR } from '../../api/messages';

/**
 * What a page shows while its content is on the way.
 *
 * Deliberately a line of text rather than a skeleton: the site's content arrives
 * in a single request per page, so the wait is one short beat, and a shimmering
 * mock of the layout would draw more attention to it than the real thing takes.
 *
 * `role="status"` with `aria-live="polite"` means a screen reader announces the
 * wait once, without interrupting whatever it is reading.
 */
export function PageLoading({ label = 'Chargement…' }: { label?: string }) {
  return (
    <p className={styles.loadState} role="status" aria-live="polite" data-testid="page-loading">
      {label}
    </p>
  );
}

export interface PageErrorProps {
  /** Offered when there is something to retry — a network blip, a 5xx. */
  onRetry?: () => void;
  message?: string;
}

/**
 * What a page shows when the request failed.
 *
 * Distinct from the 404 panel on purpose: "this does not exist" and "this could
 * not be loaded" call for different things from the reader, and only the second
 * one is worth trying again.
 */
export function PageError({ onRetry, message = CONTENT_ERROR }: PageErrorProps) {
  return (
    <div className={styles.loadState} role="alert" data-testid="page-error">
      <p>{message}</p>
      {onRetry && (
        <button type="button" className={styles.loadRetry} onClick={onRetry}>
          Réessayer
        </button>
      )}
    </div>
  );
}
