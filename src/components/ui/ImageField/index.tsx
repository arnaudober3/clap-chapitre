import { useId, useRef, useState } from 'react';
import { ApiError } from '../../../api/client';
import { mediaUrl, uploadImage } from '../../../api/mutations';
import styles from './ImageField.module.css';

/**
 * Choosing an image, uploading it, and holding on to its key.
 *
 * Covers used to be CSS gradient strings and the dropzone was decorative — a
 * `<div>` with no `onDrop` and no file input behind it. They are real images
 * now, stored in R2, and this is the control that puts one there.
 *
 * It uploads on selection rather than on save, which is what lets the field show
 * a preview: the parent form only ever holds the resulting key, so saving stays
 * a plain JSON write and a form that is abandoned leaves at most an unreferenced
 * object behind — swept up the next time the row is written.
 *
 * Both a drop target and a file input, because the design shows a dropzone and
 * a dropzone alone is unreachable by keyboard.
 */
export interface ImageFieldProps {
  /** The stored R2 key, or '' when there is no image yet. */
  value: string;
  onChange(key: string): void;
  /** Picks the key prefix and the preview's aspect ratio. */
  kind?: 'cover' | 'portrait';
  label: string;
  /** Shown inside the empty zone. */
  hint?: string;
  'data-testid'?: string;
}

const MAX_BYTES = 5 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export default function ImageField({
  value,
  onChange,
  kind = 'cover',
  label,
  hint = 'Glissez une image ici, ou cliquez pour en choisir une.',
  'data-testid': testId = 'image-field',
}: ImageFieldProps) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [error, setError] = useState<string>();

  async function accept(file: File | undefined) {
    if (!file) return;

    // Checked here as well as server-side: refusing a 30 MB file before it is
    // uploaded is the difference between an instant message and a long wait
    // ending in the same message.
    if (!TYPES.includes(file.type)) {
      setError('Format non accepté. JPEG, PNG, WebP ou AVIF.');
      return;
    }
    if (file.size > MAX_BYTES) {
      setError('Image trop lourde (5 Mo maximum).');
      return;
    }

    setError(undefined);
    setBusy(true);
    try {
      const { key } = await uploadImage(file, kind);
      onChange(key);
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : "L’envoi a échoué.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className={styles.field} data-testid={testId}>
      <label
        className={styles.zone}
        htmlFor={inputId}
        data-over={over}
        data-busy={busy}
        data-ratio={kind}
        onDragOver={(event) => {
          // Without this the browser navigates to the dropped file.
          event.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setOver(false);
          void accept(event.dataTransfer.files[0]);
        }}
      >
        {value && !busy ? (
          <img className={styles.preview} src={mediaUrl(value)} alt="" />
        ) : (
          <span className={styles.hint}>{busy ? 'Envoi en cours…' : hint}</span>
        )}
      </label>

      <input
        ref={input}
        id={inputId}
        className={styles.input}
        type="file"
        accept={TYPES.join(',')}
        aria-label={label}
        disabled={busy}
        onChange={(event) => {
          void accept(event.target.files?.[0]);
          // Cleared so choosing the same file twice fires `change` again — after
          // a failed upload, re-picking it is the obvious retry.
          event.target.value = '';
        }}
      />

      <div className={styles.row}>
        <button
          type="button"
          className={styles.action}
          onClick={() => input.current?.click()}
          disabled={busy}
        >
          {value ? 'Remplacer' : 'Choisir une image'}
        </button>
        {value && (
          <button
            type="button"
            className={styles.action}
            onClick={() => {
              setError(undefined);
              onChange('');
            }}
            disabled={busy}
          >
            Retirer
          </button>
        )}
      </div>

      {error && (
        <p className={styles.error} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
