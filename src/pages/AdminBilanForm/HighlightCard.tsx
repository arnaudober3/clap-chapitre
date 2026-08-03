import { useState, type DragEvent, type KeyboardEvent } from 'react';
import { MEDIUM_ACCENT, MEDIUM_CHIP_LABEL } from '../../media';
import type { Medium } from '../../../shared/content';
import styles from './AdminBilanForm.module.css';

/** One editable coup de cœur — the fields design 6d exposes for an avis. */
export interface Highlight {
  /** The avis id, or a synthetic one for a card that has no avis behind it. */
  id: string;
  medium: Medium;
  title: string;
  hook: string;
  body: string;
  relatedTitle: string;
  relatedNote: string;
  forThoseWho: string;
}

/** Everything but `id` and `medium` is editable. */
export type HighlightPatch = Partial<Omit<Highlight, 'id' | 'medium'>>;

/**
 * A "coup de cœur" card (design 6d desktop → 7c mobile): a medium-coloured band,
 * the work's title and hook, the body, the "À rapprocher de" pair and the
 * "Pour ceux qui…" line. The band replaces the cover art — the design settled on
 * a colour code rather than an affiche, so the card stays network-free.
 *
 * The handle moves the card anywhere in the bilan, medium regardless — the
 * order is the author's. `draggable` is only switched on while the handle is
 * held, so the whole card doesn't become one big drag target and text stays
 * selectable in the fields. The handle is also a real button: ↑/↓ move the
 * card, which is the only way to reorder without a pointer. Design 7c has no
 * handle, so it is hidden below the lg breakpoint — on a phone the order is
 * the model's.
 */
export default function HighlightCard({
  value,
  onChange,
  position,
  count,
  dragging = false,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
}: {
  value: Highlight;
  onChange: (patch: HighlightPatch) => void;
  /** 1-based rank in the bilan, for the handle's label. */
  position: number;
  /** How many coups de cœur the bilan holds. */
  count: number;
  dragging?: boolean;
  onDragStart: () => void;
  onDragOver: () => void;
  onDragEnd: () => void;
  onMove: (delta: -1 | 1) => void;
}) {
  const field = (name: string) => `highlight-${value.id}-${name}`;
  // Held only while the pointer is down on the handle — see the note above.
  const [grabbed, setGrabbed] = useState(false);

  function startDrag(event: DragEvent) {
    // Firefox refuses to start a drag without a payload.
    event.dataTransfer.setData('text/plain', value.id);
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
    <article
      className={dragging ? `${styles.card} ${styles.cardDragging}` : styles.card}
      draggable={grabbed}
      onDragStart={startDrag}
      onDragEnd={endDrag}
      onDragOver={(event) => {
        // Without this the drop is refused and no reorder ever happens.
        event.preventDefault();
        onDragOver();
      }}
      onDrop={(event) => event.preventDefault()}
      data-testid="highlight-card"
    >
      <span
        className={styles.band}
        style={{ ['--band-accent' as string]: MEDIUM_ACCENT[value.medium] }}
        aria-hidden="true"
      />

      <div className={styles.cardBody}>
        <div className={styles.cardHead}>
          <span
            className={styles.mediumChip}
            style={{ ['--chip-accent' as string]: MEDIUM_ACCENT[value.medium] }}
          >
            {MEDIUM_CHIP_LABEL[value.medium]}
          </span>
          <input
            id={field('title')}
            className={styles.workTitle}
            aria-label="Titre de l’œuvre"
            value={value.title}
            onChange={(event) => onChange({ title: event.target.value })}
            placeholder="Titre de l’œuvre"
          />
        </div>

        <input
          id={field('hook')}
          className={styles.workHook}
          aria-label="Accroche"
          value={value.hook}
          onChange={(event) => onChange({ hook: event.target.value })}
          placeholder="La question qui ouvre l’avis…"
        />

        <textarea
          id={field('body')}
          className={styles.workBody}
          aria-label="Avis"
          value={value.body}
          onChange={(event) => onChange({ body: event.target.value })}
          placeholder="Écrivez l’avis…"
        />

        <div className={styles.related}>
          <span className={styles.relatedLabel} aria-hidden="true">
            <span className={styles.relatedLabelFull}>À rapprocher de</span>
            <span className={styles.relatedLabelShort}>À rapprocher</span>
          </span>
          <input
            id={field('related-title')}
            className={styles.relatedTitle}
            aria-label="À rapprocher de — titre"
            value={value.relatedTitle}
            onChange={(event) => onChange({ relatedTitle: event.target.value })}
            placeholder="Une œuvre proche"
          />
          <span className={styles.relatedDash} aria-hidden="true">
            —
          </span>
          <input
            id={field('related-note')}
            className={styles.relatedNote}
            aria-label="À rapprocher de — en quoi"
            value={value.relatedNote}
            onChange={(event) => onChange({ relatedNote: event.target.value })}
            placeholder="ce qui les rapproche."
          />
        </div>

        <div className={styles.forThoseWho}>
          <label
            className={styles.forThoseWhoLabel}
            style={{ ['--chip-accent' as string]: MEDIUM_ACCENT[value.medium] }}
            htmlFor={field('for-those-who')}
          >
            Pour ceux qui…
          </label>
          <input
            id={field('for-those-who')}
            className={styles.forThoseWhoInput}
            value={value.forThoseWho}
            onChange={(event) => onChange({ forThoseWho: event.target.value })}
            placeholder="Pour ceux qui aiment…"
          />
        </div>
      </div>

      <button
        type="button"
        className={styles.handle}
        aria-label={`Déplacer « ${value.title || 'sans titre'} » — ${position} sur ${count}`}
        onPointerDown={() => setGrabbed(true)}
        onPointerUp={() => setGrabbed(false)}
        onKeyDown={moveOnArrow}
      >
        <span aria-hidden="true">⋮⋮</span>
      </button>
    </article>
  );
}
