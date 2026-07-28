import type { YearStatField } from '../../mock/apropos';
import styles from './AdminAPropos.module.css';

/**
 * The "Cette année" block of design 6f / 7e: one row per counter, label and
 * number both editable. The row set is fixed — the maquette has no add/remove
 * affordance, the panel is the three lines the public page renders.
 */
export default function YearStatsFields({
  rows,
  onChange,
}: {
  rows: YearStatField[];
  onChange: (index: number, patch: Partial<YearStatField>) => void;
}) {
  return (
    <div className={styles.field}>
      <span className={styles.label} id="apropos-stats-label">
        Bloc « Cette année »
      </span>
      <div className={styles.statRows} role="group" aria-labelledby="apropos-stats-label">
        {rows.map((row, index) => (
          <div key={index} className={styles.statRow}>
            <input
              className={styles.statLabelInput}
              value={row.label}
              aria-label={`Libellé de la ligne ${index + 1}`}
              onChange={(event) => onChange(index, { label: event.target.value })}
              placeholder="Intitulé"
            />
            {/* Text input, not number: the counter has to accept being emptied
                while it is retyped, and the spinner has no place in the frame. */}
            <input
              className={styles.statValueInput}
              value={row.value}
              inputMode="numeric"
              aria-label={`Valeur de la ligne ${index + 1}`}
              onChange={(event) => onChange(index, { value: event.target.value })}
              placeholder="0"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
