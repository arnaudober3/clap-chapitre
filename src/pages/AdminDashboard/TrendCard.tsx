import type { TrendPoint } from '../../content/dashboard';
import styles from './AdminDashboard.module.css';

const VIEW_W = 300;
const VIEW_H = 110;
const PAD_X = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 14;

/**
 * "Tendance des vues" (design 6b / 6h): an inline SVG area+line sparkline over
 * the 12-month trend. The path is computed from the mock data (no chart lib), so
 * the curve always follows the numbers.
 */
export default function TrendCard({ points, peak }: { points: TrendPoint[]; peak: TrendPoint }) {
  const values = points.map((p) => p.views);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;

  const coords = points.map((point, i) => {
    const x = PAD_X + (i * (VIEW_W - PAD_X * 2)) / (points.length - 1);
    const y = PAD_TOP + (1 - (point.views - min) / span) * (VIEW_H - PAD_TOP - PAD_BOTTOM);
    return { x, y };
  });

  const line = coords.map((c) => `${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ');
  const last = coords[coords.length - 1];
  const area = `M${coords[0].x.toFixed(1)},${coords[0].y.toFixed(1)} ${coords
    .slice(1)
    .map((c) => `L${c.x.toFixed(1)},${c.y.toFixed(1)}`)
    .join(' ')} L${last.x.toFixed(1)},${VIEW_H} L${coords[0].x.toFixed(1)},${VIEW_H} Z`;

  return (
    <section className={styles.card}>
      <h2 className={styles.cardTitleSm}>Tendance des vues</h2>
      <p className={styles.cardSubtitle}>12 mois · pic en {peak.month}</p>
      <svg
        className={styles.spark}
        viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
        role="img"
        aria-label={`Tendance des vues sur 12 mois, pic en ${peak.month}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#trend-fill)" />
        <polyline
          points={line}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* Point terminal : une ligne de longueur nulle avec cap arrondi et
            trait non mis à l'échelle, pour rester un disque parfait malgré le
            preserveAspectRatio="none" qui étirerait un <circle>. */}
        <line
          x1={last.x}
          y1={last.y}
          x2={last.x}
          y2={last.y}
          stroke="var(--accent)"
          strokeWidth="7"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </section>
  );
}
