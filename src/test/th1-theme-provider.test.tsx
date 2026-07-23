import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  ThemeProvider,
  useTheme,
  STORAGE_KEY,
} from '../theme/ThemeContext';

/** Small probe that surfaces the theme state and lets a test drive it. */
function Probe() {
  const { preference, applied, setPreference } = useTheme();
  return (
    <div>
      <span data-testid="pref">{preference}</span>
      <span data-testid="applied">{applied}</span>
      <button onClick={() => setPreference('dark')}>go dark</button>
      <button onClick={() => setPreference('light')}>go light</button>
      <button onClick={() => setPreference('auto')}>go auto</button>
    </div>
  );
}

/** Install a controllable matchMedia mock; returns a setter for the dark match. */
function mockMatchMedia(initialDark: boolean) {
  let matches = initialDark;
  const listeners = new Set<() => void>();
  const mql = {
    get matches() {
      return matches;
    },
    media: '(prefers-color-scheme: dark)',
    addEventListener: (_: string, cb: () => void) => listeners.add(cb),
    removeEventListener: (_: string, cb: () => void) => listeners.delete(cb),
  };
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => mql),
  );
  return {
    setDark(next: boolean) {
      matches = next;
      listeners.forEach((cb) => cb());
    },
  };
}

describe('TH-1 ThemeProvider', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to auto and resolves light when the OS is light', () => {
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('pref')).toHaveTextContent('auto');
    expect(screen.getByTestId('applied')).toHaveTextContent('light');
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('setPreference("dark") applies dark and persists the choice', async () => {
    mockMatchMedia(false);
    const user = userEvent.setup();
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    await user.click(screen.getByRole('button', { name: 'go dark' }));

    expect(screen.getByTestId('applied')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(STORAGE_KEY)).toBe('dark');
  });

  it('auto follows the OS scheme, including live changes', () => {
    const media = mockMatchMedia(true);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    // Starts dark because the OS prefers dark.
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    act(() => media.setDark(false));
    expect(document.documentElement.getAttribute('data-theme')).toBe('light');
  });

  it('reads the persisted preference on mount', () => {
    localStorage.setItem(STORAGE_KEY, 'dark');
    mockMatchMedia(false);
    render(
      <ThemeProvider>
        <Probe />
      </ThemeProvider>,
    );
    expect(screen.getByTestId('pref')).toHaveTextContent('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
