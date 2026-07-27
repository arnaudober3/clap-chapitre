import styles from './AdminArticleForm.module.css';

/** The decorative formatting buttons of design 6c (the 4th drops on mobile). */
const TOOLS = [
  { glyph: 'B', label: 'Gras', className: styles.toolBold },
  { glyph: 'I', label: 'Italique', className: styles.toolItalic },
  { glyph: '”', label: 'Citation', className: undefined },
  { glyph: '↔', label: 'Séparateur', className: styles.toolWide },
];

/**
 * "Corps de l'avis" — label, mini toolbar and the body textarea. The toolbar is
 * cosmetic in this prototype: there is no rich-text model behind it, so the
 * buttons carry an explicit label and do nothing.
 */
export default function BodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className={`${styles.field} ${styles.fieldBody}`}>
      <div className={styles.bodyHead}>
        <label className={styles.label} htmlFor="article-body">
          Corps de l’avis
        </label>
        <div className={styles.toolbar}>
          {TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              className={tool.className ? `${styles.tool} ${tool.className}` : styles.tool}
              aria-label={tool.label}
            >
              {tool.glyph}
            </button>
          ))}
        </div>
      </div>
      <textarea
        id="article-body"
        className={styles.textarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Écrivez l’avis…"
      />
    </div>
  );
}
