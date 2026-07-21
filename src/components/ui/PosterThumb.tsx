import styles from './ui.module.css';

/**
 * A gradient poster tile. Renders a 2/3 aspect-ratio tile whose background is
 * the given `cover` CSS gradient string — it never emits a network image
 * request (no <img>, no url()). When `cover` is empty it renders a neutral,
 * token-colored fallback tile rather than a broken/blank tile. Page-agnostic:
 * takes only props.
 */
export default function PosterThumb({
  cover,
  className,
  'data-testid': testId,
}: {
  cover: string;
  className?: string;
  'data-testid'?: string;
}) {
  const hasCover = cover.trim().length > 0;
  return (
    <div
      className={
        className
          ? `${styles.poster} ${className}`
          : styles.poster
      }
      style={hasCover ? { background: cover } : undefined}
      data-testid={testId ?? 'poster-thumb'}
      data-empty={hasCover ? undefined : 'true'}
      aria-hidden="true"
    />
  );
}
