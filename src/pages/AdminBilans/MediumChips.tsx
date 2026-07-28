import type { Medium } from '../../mock/types';
import styles from './AdminBilans.module.css';

/**
 * Medium → chip label + accent token. The order is the one the site uses
 * everywhere (films, séries, livres, docs), so a bilan's tally always reads the
 * same way whatever the order its counts were authored in.
 */
const MEDIUM_CHIP: Array<{ medium: Medium; one: string; many: string; accent: string }> = [
  { medium: 'film', one: 'film', many: 'films', accent: 'var(--medium-film)' },
  { medium: 'serie', one: 'série', many: 'séries', accent: 'var(--medium-serie)' },
  { medium: 'livre', one: 'livre', many: 'livres', accent: 'var(--medium-livre)' },
  { medium: 'doc', one: 'doc', many: 'docs', accent: 'var(--medium-docs)' },
];

/**
 * A bilan's per-medium tally (design 9a "Œuvres" column). The unit is spelled
 * out on the cards ("4 films") and hidden on the dense table, where the column
 * head and the chip colour already say what is being counted. A medium with no
 * avis renders nothing — a bilan is about what was watched and read, not about
 * the gaps.
 */
export default function MediumChips({
  counts,
}: {
  counts: Partial<Record<Medium, number>>;
}) {
  return (
    <>
      {MEDIUM_CHIP.map(({ medium, one, many, accent }) => {
        const count = counts[medium] ?? 0;
        if (count === 0) return null;
        return (
          <span
            key={medium}
            className={styles.chip}
            style={{ ['--chip-accent' as string]: accent }}
          >
            {count}
            <span className={styles.chipUnit}> {count > 1 ? many : one}</span>
          </span>
        );
      })}
    </>
  );
}
