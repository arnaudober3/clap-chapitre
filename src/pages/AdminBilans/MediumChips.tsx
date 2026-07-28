import type { Medium } from '../../mock/types';
import { MEDIUM_ACCENT } from '../../media';
import styles from './AdminBilans.module.css';

/**
 * Medium → the lowercase counting units this tally spells out ("4 films"). They
 * exist nowhere else, so they stay local; the colour comes from the shared
 * MEDIUM_ACCENT. The order is the one the site uses everywhere (films, séries,
 * livres, docs), so a bilan's tally always reads the same way whatever the
 * order its counts were authored in.
 */
const MEDIUM_UNIT: Array<{ medium: Medium; one: string; many: string }> = [
  { medium: 'film', one: 'film', many: 'films' },
  { medium: 'serie', one: 'série', many: 'séries' },
  { medium: 'livre', one: 'livre', many: 'livres' },
  { medium: 'doc', one: 'doc', many: 'docs' },
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
      {MEDIUM_UNIT.map(({ medium, one, many }) => {
        const count = counts[medium] ?? 0;
        if (count === 0) return null;
        return (
          <span
            key={medium}
            className={styles.chip}
            style={{ ['--chip-accent' as string]: MEDIUM_ACCENT[medium] }}
          >
            {count}
            <span className={styles.chipUnit}> {count > 1 ? many : one}</span>
          </span>
        );
      })}
    </>
  );
}
