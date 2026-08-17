import styles from './Logo.module.css';

/**
 * The blob outline, as an exact SVG translation of the design's CSS
 * `border-radius: 42% 58% 55% 45% / 45% 45% 55% 55%` on a 100×100 box: one
 * quarter-ellipse arc per corner (rx/ry taken straight from those percentages),
 * each straight edge between them collapsing to a point because opposite radii
 * happen to sum to 100. Rotated -4deg like the design's tile.
 */
const BLOB_PATH =
  'M42,0 A58,45 0 0 1 100,45 A55,55 0 0 1 45,100 A45,55 0 0 1 0,45 A42,45 0 0 1 42,0 Z';

export interface LogoMarkProps {
  size?: number;
  className?: string;
}

/** The organic terracotta blob carrying the italic "C" — the site's monogram. */
export function LogoMark({ size = 40, className }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className ? `${styles.mark} ${className}` : styles.mark}
      aria-hidden="true"
    >
      <path className={styles.blob} d={BLOB_PATH} transform="rotate(-4 50 50)" />
      <text
        className={styles.letter}
        x="50"
        y="50"
        dx="-3.5"
        dy="5"
        textAnchor="middle"
        dominantBaseline="central"
      >
        C
      </text>
    </svg>
  );
}

export interface LogoProps {
  markSize?: number;
  stacked?: boolean;
  className?: string;
}

