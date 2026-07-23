import { useTheme, type ThemePreference } from '../../../theme/ThemeContext';
import styles from './ThemeToggle.module.css';

/** The three theme choices, in display order, with FR labels and a glyph. */
const OPTIONS: { value: ThemePreference; label: string; glyph: string }[] = [
  { value: 'auto', label: 'Auto', glyph: '◐' },
  { value: 'light', label: 'Clair', glyph: '☀' },
  { value: 'dark', label: 'Sombre', glyph: '☾' },
];

/**
 * Segmented 3-way theme control (Auto · Clair · Sombre). A radiogroup whose
 * checked radio mirrors the current preference; picking one calls
 * setPreference. Page-agnostic, colors via var(--…) only.
 */
export default function ThemeToggle({
  className,
  'data-testid': testId,
}: {
  className?: string;
  'data-testid'?: string;
}) {
  const { preference, setPreference } = useTheme();

  return (
    <div
      className={className ? `${styles.toggle} ${className}` : styles.toggle}
      role="radiogroup"
      aria-label="Thème"
      data-testid={testId ?? 'theme-toggle'}
    >
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            className={active ? `${styles.option} ${styles.optionActive}` : styles.option}
            onClick={() => setPreference(option.value)}
          >
            <span className={styles.glyph} aria-hidden="true">
              {option.glyph}
            </span>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
