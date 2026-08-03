import { useState, type DragEvent, type KeyboardEvent } from 'react';
import { linkMark, type SocialLinkField } from '../../content/mesuivre';
import styles from './AdminMeSuivre.module.css';

/**
 * Chip plate + mark per platform, keyed on the lower-cased name rather than on
 * the row id: a row the editor added has no SocialKey, and renaming one should
 * repaint its chip. An unknown name falls back to the neutral pair so the style
 * always resolves to a defined token, never 'var(--chip-undefined-bg)'.
 * Same shape as SWATCH in src/pages/MeSuivre/SocialCard.tsx.
 */
const TINT: Record<string, { background: string; color: string } | undefined> = {
  threads: { background: 'var(--chip-threads-bg)', color: 'var(--chip-threads-fg)' },
  letterboxd: {
    background: 'var(--chip-letterboxd-bg)',
    color: 'var(--chip-letterboxd-fg)',
  },
  babelio: { background: 'var(--chip-babelio-bg)', color: 'var(--chip-babelio-fg)' },
  linkedin: { background: 'var(--chip-linkedin-bg)', color: 'var(--chip-linkedin-fg)' },
};

const NEUTRAL_TINT = { background: 'var(--chip-bg)', color: 'var(--chip-fg)' };

export interface LinkRowProps {
  field: SocialLinkField;
  onChange: (next: Partial<SocialLinkField>) => void;
  onRemove: () => void;
  /** 1-based rank in the list, for the handle's label. */
  position: number;
  /** How many links the page holds. */
  count: number;
  dragging?: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onMove: (delta: -1 | 1) => void;
}

/**
 * One editable link of designs 6g/7f. Desktop lays it out on a single line
 * (handle · chip · name · underlined URL · ✕); the phone stacks the name over
 * the URL and drops the handle — on a phone the order is the model's.
 *
 * Reordering follows the bilan editor's coups de cœur: `draggable` is only
 * switched on while the handle is held, so the whole row doesn't become one big
 * drag target and text stays selectable in the fields, and the list reorders
 * live under the pointer rather than on drop. The handle is a real button too:
 * ↑/↓ move the row, which is the only way to reorder without a pointer.
 *
 * The name is an <input> where 6g prints static text: "Ajouter un lien" would
 * otherwise produce a row that can never be named.
 */
export default function LinkRow({
  field,
  onChange,
  onRemove,
  position,
  count,
  dragging = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
}: LinkRowProps) {
  const { name, url, handle, glyph, cta } = field;
  const tint = TINT[name.trim().toLowerCase()] ?? NEUTRAL_TINT;
  const label = name.trim() || 'sans nom';
  // Held only while the pointer is down on the handle — see the note above.
  const [grabbed, setGrabbed] = useState(false);

  function startDrag(event: DragEvent) {
    // Firefox refuses to start a drag without a payload.
    event.dataTransfer.setData('text/plain', field.id);
    event.dataTransfer.effectAllowed = 'move';
    onDragStart();
  }

  function endDrag() {
    setGrabbed(false);
    onDragEnd();
  }

  function moveOnArrow(event: KeyboardEvent) {
    const delta = event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : undefined;
    if (delta === undefined) return;
    // The page would scroll away from the button otherwise.
    event.preventDefault();
    onMove(delta);
  }

  return (
    <li
      className={dragging ? `${styles.row} ${styles.rowDragging}` : styles.row}
      draggable={grabbed}
      onDragStart={startDrag}
      onDragEnd={endDrag}
      onDragOver={(event) => {
        // Without this the drop is refused and no reorder ever happens.
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => event.preventDefault()}
      data-testid="link-row"
    >
      <button
        type="button"
        className={styles.handle}
        aria-label={`Déplacer « ${label} » — ${position} sur ${count}`}
        onPointerDown={() => setGrabbed(true)}
        onPointerUp={() => setGrabbed(false)}
        onKeyDown={moveOnArrow}
      >
        <span aria-hidden="true">⋮⋮</span>
      </button>

      <span className={styles.chip} style={tint} aria-hidden="true">
        {glyph.trim() || linkMark(name)}
      </span>

      <div className={styles.rowBody}>
        <input
          className={styles.nameInput}
          value={name}
          onChange={(event) => onChange({ name: event.target.value })}
          aria-label={`Nom du lien ${position}`}
          placeholder="Nom du réseau"
        />
        <input
          className={styles.urlInput}
          value={url}
          onChange={(event) => onChange({ url: event.target.value })}
          aria-label={`Adresse du lien ${position}`}
          placeholder="exemple.fr/mon-profil"
        />
        {/* The three columns the public page renders and the form never edited.
            They are NOT NULL, so a link created here without them would show up
            incomplete on /me-suivre. */}
        <div className={styles.rowExtras}>
          <input
            className={styles.extraInput}
            value={handle}
            onChange={(event) => onChange({ handle: event.target.value })}
            aria-label={`Pseudo du lien ${position}`}
            placeholder="@pseudo"
          />
          <input
            className={styles.extraInput}
            value={glyph}
            onChange={(event) => onChange({ glyph: event.target.value })}
            aria-label={`Sigle du lien ${position}`}
            placeholder="Ab"
            maxLength={4}
          />
          <input
            className={styles.extraInput}
            value={cta}
            onChange={(event) => onChange({ cta: event.target.value })}
            aria-label={`Libellé du bouton ${position}`}
            placeholder="Suivre"
          />
        </div>
      </div>

      <button
        type="button"
        className={styles.remove}
        onClick={onRemove}
        aria-label={`Supprimer « ${label} »`}
      >
        <span aria-hidden="true">✕</span>
      </button>
    </li>
  );
}
