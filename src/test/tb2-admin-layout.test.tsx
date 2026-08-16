import { describe, it, expect } from 'vitest';
import { render, screen, within, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminHeader from '../components/layout/AdminHeader';
import { useTestDb } from './api-server';
import { SEED } from './fixtures';
import { deleteArticle } from '../api/mutations';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminHeader />
    </MemoryRouter>,
  );
}

describe('TB-2 admin shell', () => {
  it('lists the admin sections with their badges and a link back to the site', async () => {
    // SEED holds 3 avis (2 published, 1 draft) and 1 published bilan.
    await useTestDb(SEED);
    renderAt('/admin');
    // Badges (rail + drawer render each once → at least one occurrence).
    expect((await screen.findAllByText('3')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('1').length).toBeGreaterThan(0);
    // "Voir le site" points home.
    const back = screen.getAllByRole('link', { name: /Voir le site/ });
    expect(back.length).toBeGreaterThan(0);
    expect(back[0]).toHaveAttribute('href', '/');
    // Admin kicker present (rail + top bar).
    expect(screen.getAllByText('Espace admin').length).toBeGreaterThan(0);
  });

  it('shows a 0 badge for Articles and Bilans culturels when the catalogue is empty', async () => {
    renderAt('/admin');
    const articlesLinks = await screen.findAllByRole('link', { name: /^Articles/ });
    for (const link of articlesLinks) {
      expect(within(link).getByText('0')).toBeInTheDocument();
    }
    const bilansLinks = screen.getAllByRole('link', { name: /^Bilans culturels/ });
    for (const link of bilansLinks) {
      expect(within(link).getByText('0')).toBeInTheDocument();
    }
  });

  it('updates the Articles badge after a delete elsewhere, without remounting', async () => {
    await useTestDb(SEED);
    renderAt('/admin');
    const articlesLink = () => screen.getAllByRole('link', { name: /^Articles/ })[0];
    await screen.findAllByText('3');
    expect(within(articlesLink()).getByText('3')).toBeInTheDocument();

    // A form elsewhere in the app deletes an avis — the header never unmounts,
    // so it must hear about it through the admin:articles-changed event.
    await act(async () => {
      await deleteArticle('un-dernier-ete');
    });

    expect(await within(articlesLink()).findByText('2')).toBeInTheDocument();
  });

  it('opens the drawer on ☰ and closes it on ✕', async () => {
    const user = userEvent.setup();
    renderAt('/admin');
    // Closed: the drawer is aria-hidden, so it is out of the a11y tree.
    expect(screen.queryByRole('dialog')).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByRole('link', { name: /Tableau de bord/ })).toBeInTheDocument();

    await user.click(within(dialog).getByRole('button', { name: 'Fermer le menu' }));
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('marks Tableau de bord active only on the /admin index', () => {
    const { unmount } = renderAt('/admin');
    for (const link of screen.getAllByRole('link', { name: /^Tableau de bord/ })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
    unmount();

    renderAt('/admin/articles');
    for (const link of screen.getAllByRole('link', { name: /^Tableau de bord/ })) {
      expect(link).not.toHaveAttribute('aria-current', 'page');
    }
    for (const link of screen.getAllByRole('link', { name: /^Articles/ })) {
      expect(link).toHaveAttribute('aria-current', 'page');
    }
  });
});
