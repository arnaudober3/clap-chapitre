import LinkRow from './LinkRow';
import type { SocialLinkField } from '../../content/mesuivre';
import styles from './AdminMeSuivre.module.css';

export interface LinkRowsProps {
  rows: SocialLinkField[];
  /** Which row is being dragged, if any — it dims while it travels. */
  dragging?: string;
  onDragStart: (id: string) => void;
  onDragOver: (overId: string) => void;
  onDragEnd: () => void;
  onChange: (id: string, next: Partial<SocialLinkField>) => void;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: -1 | 1) => void;
  onAdd: () => void;
  /** Validation errors keyed by link id. */
  errors?: Map<string, string>;
}

/**
 * The "Liens" block of designs 6g/7f: the rows plus the dashed "Ajouter un
 * lien" call to action. Presentational — the order and the drag state both live
 * in the page, the way the bilan editor holds its coups de cœur.
 */
export default function LinkRows({
  rows,
  dragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onChange,
  onRemove,
  onMove,
  onAdd,
  errors = new Map(),
}: LinkRowsProps) {
  return (
    <div className={styles.linksField}>
      <p className={styles.label} id="mesuivre-links-label">
        Liens
      </p>

      {rows.length > 0 && (
        <ul
          className={styles.rows}
          aria-labelledby="mesuivre-links-label"
          data-testid="link-rows"
          data-anim="stagger"
        >
          {rows.map((field, index) => (
            <LinkRow
              key={field.id}
              field={field}
              position={index + 1}
              count={rows.length}
              dragging={dragging === field.id}
              onDragStart={() => onDragStart(field.id)}
              onDragOver={() => onDragOver(field.id)}
              onDragEnd={onDragEnd}
              onChange={(next) => onChange(field.id, next)}
              onRemove={() => onRemove(field.id)}
              onMove={(delta) => onMove(field.id, delta)}
              error={errors.get(field.id)}
            />
          ))}
        </ul>
      )}

      <button
        type="button"
        className={styles.addButton}
        onClick={onAdd}
        data-testid="add-link"
      >
        <span className={styles.addPlus} aria-hidden="true">
          +
        </span>
        Ajouter un lien
      </button>
    </div>
  );
}
