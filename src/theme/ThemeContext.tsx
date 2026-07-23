import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

/**
 * Theme system for the Salon UI.
 *
 * - `ThemePreference` is what the user chooses: `auto` follows the OS
 *   `prefers-color-scheme`; `light`/`dark` force a theme.
 * - `AppliedTheme` is the concrete theme resolved from the preference and
 *   always mirrored onto `<html data-theme="…">`, so tokens.css only needs a
 *   single `:root[data-theme="dark"]` override block.
 *
 * The preference is persisted to localStorage under STORAGE_KEY; an inline
 * script in index.html applies it before first paint to avoid a flash.
 */
export type ThemePreference = 'auto' | 'light' | 'dark';
export type AppliedTheme = 'light' | 'dark';

export const STORAGE_KEY = 'cc-theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

interface ThemeContextValue {
  preference: ThemePreference;
  applied: AppliedTheme;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * Default value so components (e.g. the ThemeToggle inside <Header>) render
 * outside a ThemeProvider — as in unit tests that mount Header/Layout directly.
 * It reflects `auto` and ignores changes; real behavior comes from the provider.
 */
const DEFAULT_VALUE: ThemeContextValue = {
  preference: 'auto',
  applied: 'light',
  setPreference: () => {},
};

const ThemeContext = createContext<ThemeContextValue>(DEFAULT_VALUE);

/** True when the OS currently prefers a dark scheme (jsdom-safe). */
function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DARK_QUERY).matches
  );
}

/** Read the persisted preference, falling back to `auto`. */
function readStoredPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'auto';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'auto'
    ? stored
    : 'auto';
}

/** Resolve a preference to the concrete theme to apply. */
function resolveApplied(preference: ThemePreference): AppliedTheme {
  if (preference === 'auto') return systemPrefersDark() ? 'dark' : 'light';
  return preference;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readStoredPreference);
  const [applied, setApplied] = useState<AppliedTheme>(() =>
    resolveApplied(readStoredPreference()),
  );

  // Persist the preference and re-resolve the applied theme whenever it changes.
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
    setApplied(resolveApplied(preference));
  }, [preference]);

  // In `auto`, follow live OS scheme changes.
  useEffect(() => {
    if (preference !== 'auto') return;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const mql = window.matchMedia(DARK_QUERY);
    const onChange = () => setApplied(mql.matches ? 'dark' : 'light');
    mql.addEventListener('change', onChange);
    return () => mql.removeEventListener('change', onChange);
  }, [preference]);

  // Mirror the applied theme onto <html> so tokens.css can override.
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', applied);
  }, [applied]);

  const setPreference = (next: ThemePreference) => setPreferenceState(next);

  return (
    <ThemeContext.Provider value={{ preference, applied, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
