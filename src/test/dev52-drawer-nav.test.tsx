import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Header from '../components/layout/Header';
import { drawerNav, secondaryNav } from '../components/layout/nav';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Header />
    </MemoryRouter>,
  );
}

const MEDIA = ['Films', 'Séries', 'Livres', 'Docs'];

async function openDrawer(): Promise<HTMLElement> {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
  return screen.getByRole('dialog');
}

describe('DEV-52 mobile drawer nav', () => {
  it('drawerNav is Accueil followed by the standalone pages', () => {
    expect(drawerNav).toEqual([{ label: 'Accueil', to: '/' }, ...secondaryNav]);
    const routes = drawerNav.map((item) => item.to);
    for (const medium of ['/films', '/series', '/livres', '/docs']) {
      expect(routes).not.toContain(medium);
    }
  });

  it('drawer lists Accueil and the pages but no media', async () => {
    renderAt('/');
    const dialog = within(await openDrawer());

    expect(dialog.getByRole('link', { name: 'Accueil' })).toHaveAttribute('href', '/');
    for (const label of ['Bilan culturel', 'À propos', 'Me suivre']) {
      expect(dialog.getByRole('link', { name: label })).toBeInTheDocument();
    }
    for (const label of MEDIA) {
      expect(dialog.queryByRole('link', { name: label })).toBeNull();
    }
  });

  it('Accueil is active only on the home route', async () => {
    const { unmount } = renderAt('/');
    let dialog = within(await openDrawer());
    expect(dialog.getByRole('link', { name: 'Accueil' })).toHaveAttribute('aria-current', 'page');
    unmount();

    renderAt('/films');
    dialog = within(await openDrawer());
    expect(dialog.getByRole('link', { name: 'Accueil' })).not.toHaveAttribute(
      'aria-current',
      'page',
    );
  });
});
