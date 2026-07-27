import { useEffect, useRef, useState } from 'react';
import styles from './AdminSelect.module.css';

/** One selectable entry — `id` is what `onChange` reports back. */
export interface AdminSelectOption<Id extends string = string> {
  id: Id;
  label: string;
}

export interface AdminSelectProps<Id extends string = string> {
  /** Accessible name of the listbox, e.g. "Période". */
  label: string;
  value: Id;
  options: Array<AdminSelectOption<Id>>;
  onChange: (id: Id) => void;
  className?: string;
  'data-testid'?: string;
}

/**
 * The admin's pill dropdown (designs 6b / 8a): a `--surface-card` trigger that
 * opens a small listbox, closing on outside click or Escape. Page-agnostic —
 * takes only props, no page/mock imports.
 */
export default function AdminSelect<Id extends string = string>({
  label,
  value,
  options,
  onChange,
  className,
  'data-testid': testId,
}: AdminSelectProps<Id>) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const current = options.find((option) => option.id === value) ?? options[0];

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function select(id: Id) {
    onChange(id);
    setOpen(false);
  }

  return (
    <div
      className={className ? `${styles.select} ${className}` : styles.select}
      ref={menuRef}
      data-testid={testId}
    >
      <button
        type="button"
        className={styles.pill}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {current?.label}{' '}
        <span className={styles.caret} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && (
        <ul className={styles.menu} role="listbox" aria-label={label}>
          {options.map((option) => (
            <li key={option.id} role="option" aria-selected={option.id === value}>
              <button
                type="button"
                className={
                  option.id === value
                    ? `${styles.option} ${styles.optionActive}`
                    : styles.option
                }
                onClick={() => select(option.id)}
              >
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
