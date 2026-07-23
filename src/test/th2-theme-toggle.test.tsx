import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeProvider } from '../theme/ThemeContext';
import { ThemeToggle } from '../components/ui';

function mockMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: () => {},
      removeEventListener: () => {},
    })),
  );
}

function renderToggle() {
  return render(
    <ThemeProvider>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe('TH-2 ThemeToggle', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    mockMatchMedia();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders a radiogroup with the three theme options', () => {
    renderToggle();
    const group = screen.getByRole('radiogroup', { name: 'Thème' });
    const radios = within(group).getAllByRole('radio');
    // Glyphs are aria-hidden, so the accessible names are the FR labels only.
    expect(radios.map((r) => r.getAttribute('aria-checked'))).toHaveLength(3);
    for (const name of ['Auto', 'Clair', 'Sombre']) {
      expect(within(group).getByRole('radio', { name })).toBeInTheDocument();
    }
  });

  it('marks the current preference as checked (auto by default)', () => {
    renderToggle();
    expect(screen.getByRole('radio', { name: 'Auto' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(screen.getByRole('radio', { name: 'Sombre' })).toHaveAttribute(
      'aria-checked',
      'false',
    );
  });

  it('picking "Sombre" checks it and switches the applied theme', async () => {
    const user = userEvent.setup();
    renderToggle();
    await user.click(screen.getByRole('radio', { name: 'Sombre' }));

    expect(screen.getByRole('radio', { name: 'Sombre' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });
});
