import { ImageField } from '../../components/ui';
import styles from './AdminAPropos.module.css';

/**
 * The portrait slot of design 6f / 7e.
 *
 * It used to preview the `--portrait-grad` gradient behind a button that did
 * nothing — the public page had no image to show and the prototype had nowhere
 * to put one. Both are true no longer: the portrait is a file in R2, and
 * `page_apropos.portrait_image` holds its key.
 *
 * The alt text is edited alongside it. `portrait_label` was a caption for a
 * gradient, which made it decorative; over a real photograph it is what a screen
 * reader reads, so it stops being optional.
 */
export default function PortraitField({
  value,
  onChange,
  label,
  onLabelChange,
}: {
  /** R2 key, or '' while there is no portrait. */
  value: string;
  onChange: (key: string) => void;
  label: string;
  onLabelChange: (label: string) => void;
}) {
  return (
    <div className={styles.portraitField}>
      <span className={styles.portraitLabel}>Portrait</span>
      <ImageField
        value={value}
        onChange={onChange}
        kind="portrait"
        label="Portrait de la page À propos"
        hint="Glisser une photo ou parcourir"
        data-testid="apropos-portrait-field"
      />
      <label className={styles.field}>
        <span className={styles.portraitLabel}>Texte alternatif</span>
        <input
          className={styles.input}
          value={label}
          onChange={(event) => onLabelChange(event.target.value)}
          placeholder="Ce que décrit la photo, pour qui ne la voit pas"
        />
      </label>
    </div>
  );
}
