import { useRef } from 'react';
import styles from './AdminArticleForm.module.css';

const TOOLS = [
  { glyph: 'B', label: 'Gras', className: styles.toolBold },
  { glyph: 'I', label: 'Italique', className: styles.toolItalic },
  { glyph: '"', label: 'Citation', className: undefined },
  { glyph: '↔', label: 'Séparateur', className: styles.toolWide },
];

function applyWrap(
  text: string,
  selStart: number,
  selEnd: number,
  wrapper: string,
): [string, number, number] {
  const selected = text.slice(selStart, selEnd);
  const before = text.slice(0, selStart);
  const after = text.slice(selEnd);
  const wrapped = selected || 'texte';
  const result = before + wrapper + wrapped + wrapper + after;

  const nextStart = selStart + wrapper.length;
  const nextEnd = nextStart + wrapped.length;

  return [result, nextStart, nextEnd];
}

function applyBlock(
  text: string,
  selStart: number,
  selEnd: number,
  prefix: string,
): [string, number, number] {
  const selected = text.slice(selStart, selEnd);
  const before = text.slice(0, selStart);
  const after = text.slice(selEnd);

  let insertedContent: string;
  if (prefix === '---') {
    insertedContent = '---';
  } else {
    const lines = (selected || 'Citation').split('\n');
    insertedContent = lines.map(line => `${prefix}${line}`).join('\n');
  }

  const needsNewlineBefore = before.length > 0 && !before.endsWith('\n\n');
  const newlineBefore = needsNewlineBefore ? '\n\n' : '';

  const needsNewlineAfter = after.length > 0 && !after.startsWith('\n\n');
  const newlineAfter = needsNewlineAfter ? '\n\n' : '';

  const result = before + newlineBefore + insertedContent + newlineAfter + after;
  const nextStart = before.length + newlineBefore.length + insertedContent.length;

  return [result, nextStart, nextStart];
}

export default function BodyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleToolClick = (tool: (typeof TOOLS)[number]) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const { selectionStart, selectionEnd } = textarea;
    let result: [string, number, number];

    if (tool.label === 'Gras') {
      result = applyWrap(value, selectionStart, selectionEnd, '**');
    } else if (tool.label === 'Italique') {
      result = applyWrap(value, selectionStart, selectionEnd, '*');
    } else if (tool.label === 'Citation') {
      result = applyBlock(value, selectionStart, selectionEnd, '> ');
    } else {
      result = applyBlock(value, selectionStart, selectionEnd, '---');
    }

    const [nextValue, nextStart, nextEnd] = result;
    onChange(nextValue);

    requestAnimationFrame(() => {
      textarea.setSelectionRange(nextStart, nextEnd);
      textarea.focus();
    });
  };

  return (
    <div className={`${styles.field} ${styles.fieldBody}`}>
      <div className={styles.bodyHead}>
        <label className={styles.label} htmlFor="article-body">
          Corps de l'avis
        </label>
        <div className={styles.toolbar}>
          {TOOLS.map((tool) => (
            <button
              key={tool.label}
              type="button"
              className={tool.className ? `${styles.tool} ${tool.className}` : styles.tool}
              aria-label={tool.label}
              onClick={() => handleToolClick(tool)}
            >
              {tool.glyph}
            </button>
          ))}
        </div>
      </div>
      <textarea
        ref={textareaRef}
        id="article-body"
        className={styles.textarea}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Écrivez l'avis…"
      />
    </div>
  );
}
