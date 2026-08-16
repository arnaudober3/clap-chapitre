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
 * There used to be an alt-text field beside it — but the public page never
 * actually read it (the portrait renders as a background-image, not an
 * `<img>`), so a real, always-present alt text is fixed in `Hero.tsx` instead
 * of left to whatever the editor typed or forgot to.
 */
export default function PortraitField({
  value,
  onChange,
}: {
  /** R2 key, or '' while there is no portrait. */
  value: string;
  onChange: (key: string) => void;
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
    </div>
  );
}
