import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminHeader from '../components/layout/AdminHeader';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AdminHeader />
    </MemoryRouter>,
  );
}

describe('TB-2 admin shell', () => {
  it('lists the admin sections with their badges and a link back to the site', () => {
    renderAt('/admin');
    // Badges (rail + drawer render each once → at least one occurrence).
    expect(screen.getAllByText('32').length).toBeGreaterThan(0);
    expect(screen.getAllByText('14').length).toBeGreaterThan(0);
    // "Voir le site" points home.
    const back = screen.getAllByRole('link', { name: /Voir le site/ });
    expect(back.length).toBeGreaterThan(0);
    expect(back[0]).toHaveAttribute('href', '/');
    // Admin kicker present (rail + top bar).
    expect(screen.getAllByText('Espace admin').length).toBeGreaterThan(0);
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
