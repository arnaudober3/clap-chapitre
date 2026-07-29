import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { TOKEN_KEY, getToken } from '../auth/auth';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('AL-4 cross links between public site and admin', () => {
  it('hides the admin link from an anonymous visitor', () => {
    window.localStorage.removeItem(TOKEN_KEY);
    renderAt('/films');
    expect(screen.queryByRole('link', { name: /Administration/ })).toBeNull();
  });

  it('shows the admin link in the desktop rail once signed in', () => {
    renderAt('/films');
    // The drawer copy is aria-hidden while closed, so only the rail one shows.
    const link = screen.getByRole('link', { name: /Administration/ });
    expect(link).toHaveAttribute('href', '/admin');
  });

  it('also carries the admin link into the mobile drawer', async () => {
    const user = userEvent.setup();
    renderAt('/films');
    await user.click(screen.getByRole('button', { name: 'Ouvrir le menu' }));
    const links = screen.getAllByRole('link', { name: /Administration/ });
    expect(links).toHaveLength(2);
    links.forEach((link) => expect(link).toHaveAttribute('href', '/admin'));
  });

  it('mirrors the admin "Voir le site" link back to the public home', () => {
    renderAt('/admin');
    screen
      .getAllByRole('link', { name: /Voir le site/ })
      .forEach((link) => expect(link).toHaveAttribute('href', '/'));
  });

  it('offers a sign-out control inside the admin shell', () => {
    renderAt('/admin');
    const header = within(screen.getByRole('banner'));
    const buttons = header.getAllByRole('button', { name: 'Se déconnecter' });
    expect(buttons.length).toBeGreaterThan(0);
    // Icon only — the wording is carried by aria-label, never rendered as text.
    buttons.forEach((button) => {
      expect(button).toHaveAttribute('title', 'Se déconnecter');
      expect(button.textContent).not.toMatch(/déconnecter/i);
    });
  });

  it('signing out clears the token and returns to the login page', async () => {
    const user = userEvent.setup();
    renderAt('/admin');
    expect(getToken()).not.toBeNull();

    await user.click(
      within(screen.getByRole('banner')).getAllByRole('button', {
        name: 'Se déconnecter',
      })[0],
    );

    expect(await screen.findByTestId('admin-login-page')).toBeInTheDocument();
    expect(getToken()).toBeNull();
  });

  it('drops the public admin link after signing out', async () => {
    const user = userEvent.setup();
    const { unmount } = renderAt('/admin');
    await user.click(
      within(screen.getByRole('banner')).getAllByRole('button', {
        name: 'Se déconnecter',
      })[0],
    );
    unmount();

    renderAt('/films');
    expect(screen.queryByRole('link', { name: /Administration/ })).toBeNull();
  });
});
