import { useState } from 'react';
import type { ApiError } from '../../../api/client';
import styles from './EditorActions.module.css';

/**
 * The action row every editor ends with.
 *
 * It exists because saving finally means something. While nothing was
 * persisted, one "Enregistrer" button was enough and the four editors each had
 * their own; now there are three distinct acts and no way to tell them apart
 * from a single button:
 *
 *   * **Enregistrer** stores the work and leaves the publication state alone.
 *   * **Publier** / **Dépublier** changes only that state.
 *   * **Supprimer** removes the thing, and asks first.
 *
 * That is the whole point of the split: a draft the editor saves must not go
 * live because "Enregistrer" was the only button on screen, and a published
 * avis must not be quietly unpublished by a save.
 *
 * It also owns the two states a form could not express before — in flight, and
 * failed. `PageError` cannot serve here: it replaces the content, and the
 * content is a form still holding unsaved work.
 */
export interface EditorActionsProps {
  /** Absent while creating: there is nothing yet to publish or delete. */
  status?: 'draft' | 'published';
  /** True while a write is in flight — every button goes inert. */
  pending?: boolean;
  /** The last failure, shown next to the buttons rather than over the form. */
  error?: ApiError;
  /** True once a save landed and nothing has been typed since. */
  saved?: boolean;
  onSave(): void;
  /** Publishes, or unpublishes when already live. Absent while creating. */
  onPublish?(): void;
  /** Absent while creating, and absent when deletion is not offered. */
  onDelete?(): void;
  /** What the confirmation names, e.g. "cet avis". */
  deleteLabel?: string;
  /**
   * Overrides the save button's wording. The editorial pages need it: they are
   * singleton rows with no publication state, so "Enregistrer le brouillon"
   * would describe something that does not exist.
   */
  saveLabel?: string;
  'data-testid'?: string;
}

export default function EditorActions({
  status,
  pending = false,
  error,
  saved = false,
  onSave,
  onPublish,
  onDelete,
  deleteLabel = 'ce contenu',
  saveLabel,
  'data-testid': testId = 'editor-actions',
}: EditorActionsProps) {
  // Two-step rather than `window.confirm`: the native dialog is untestable
  // without stubbing a global, and this keeps the destructive click a
  // deliberate second one.
  const [confirming, setConfirming] = useState(false);

  const published = status === 'published';

  return (
    <div className={styles.actions} data-testid={testId}>
      {error && (
        <span className={styles.error} role="alert">
          {error.message}
        </span>
      )}

      {!error && saved && !pending && (
        <span className={styles.state}>
          <span className={styles.dot} aria-hidden="true" />
          Enregistré
        </span>
      )}

      {onDelete && status && !confirming && (
        <button
          type="button"
          className={styles.danger}
          onClick={() => setConfirming(true)}
          disabled={pending}
        >
          Supprimer
        </button>
      )}

      {onDelete && status && confirming && (
        <>
          <span className={styles.state}>Supprimer {deleteLabel} ?</span>
          <button
            type="button"
            className={styles.secondary}
            onClick={() => setConfirming(false)}
            disabled={pending}
          >
            Annuler
          </button>
          <button
            type="button"
            className={styles.danger}
            onClick={onDelete}
            disabled={pending}
          >
            Confirmer la suppression
          </button>
        </>
      )}

      {!confirming && (
        <button
          type="button"
          className={styles.secondary}
          onClick={onSave}
          disabled={pending}
        >
          {pending ? 'Enregistrement…' : (saveLabel ?? defaultSaveLabel(status))}
        </button>
      )}

      {onPublish && !confirming && (
        <button
          type="button"
          className={styles.primary}
          onClick={onPublish}
          disabled={pending}
        >
          {published ? 'Dépublier' : 'Publier'}
        </button>
      )}
    </div>
  );
}

/**
 * The save button says what it saves. "Enregistrer le brouillon" over a draft is
 * the reassurance that it will not go live; over a published avis the same
 * wording would be a lie.
 */
function defaultSaveLabel(status?: 'draft' | 'published'): string {
  if (status === 'published') return 'Enregistrer les modifications';
  return 'Enregistrer le brouillon';
}
