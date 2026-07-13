import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import styles from '../components/layout/Layout.module.css';

function renderLayout(initialPath = '/') {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<Layout />}>
          <Route path="*" element={<div>page body</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

const NAV_LABELS = [
  'Films',
  'Séries',
  'Livres',
  'Docs',
  'Bilan culturel',
  'À propos',
  'Me suivre',
];

describe('SC-4 Layout', () => {
  it('renders the brand and all seven nav labels', () => {
    renderLayout();
    // Brand appears (rail + drawer + topbar wordmark); at least one present.
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    for (const label of NAV_LABELS) {
      // Rail + drawer each render the nav, so every label appears >= 1 time.
      expect(screen.getAllByRole('link', { name: label }).length).toBeGreaterThan(0);
    }
  });

  it('marks the NavLink matching the current route with aria-current="page"', () => {
    renderLayout('/livres');
    const active = screen.getAllByRole('link', { name: 'Livres' });
    expect(active.some((el) => el.getAttribute('aria-current') === 'page')).toBe(true);
    const inactive = screen.getAllByRole('link', { name: 'Films' });
    expect(inactive.every((el) => el.getAttribute('aria-current') !== 'page')).toBe(true);
  });

  it('opens the drawer on ☰ and closes it via the close control', async () => {
    const user = userEvent.setup();
    const { container } = renderLayout();
    const drawerRoot = container.querySelector(`.${styles.drawerRoot}`) as HTMLElement;
    expect(drawerRoot).toBeTruthy();
    // Hidden by default.
    expect(drawerRoot.className).not.toContain(styles.drawerOpen);

    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    expect(drawerRoot.className).toContain(styles.drawerOpen);

    const dialog = within(drawerRoot).getByRole('dialog');
    expect(within(dialog).getByRole('button', { name: 'Fermer le menu' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Fermer le menu' }));
    expect(drawerRoot.className).not.toContain(styles.drawerOpen);
  });
});
