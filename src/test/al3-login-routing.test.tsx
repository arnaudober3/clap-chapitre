import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { adminNav } from '../components/layout/adminNav';
import { ADMIN_USERNAME, issueMockToken } from '../mock/auth';
import { TOKEN_KEY } from '../auth/auth';
import { TEST_PASSWORD as PASSWORD } from './credentials';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

function signOutBeforeRender() {
  window.localStorage.removeItem(TOKEN_KEY);
}

describe('AL-3 admin route guard', () => {
  it('sends an anonymous visitor from every rail destination to the login page', () => {
    for (const item of adminNav) {
      signOutBeforeRender();
      const { unmount } = renderAt(item.to);
      expect(screen.getByTestId('admin-login-page')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-not-found-page')).toBeNull();
      unmount();
    }
  });

  it('guards the editors and the admin 404 alike', () => {
    for (const path of ['/admin/articles/nouveau', '/admin/bilans/nouveau', '/admin/nawak']) {
      signOutBeforeRender();
      const { unmount } = renderAt(path);
      expect(screen.getByTestId('admin-login-page')).toBeInTheDocument();
      unmount();
    }
  });

  it('lets a signed-in editor through to the real page', () => {
    window.localStorage.setItem(TOKEN_KEY, issueMockToken(ADMIN_USERNAME));
    renderAt('/admin/newsletter');
    expect(screen.getByTestId('admin-newsletter-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-login-page')).toBeNull();
  });

  it('treats an expired token as anonymous', () => {
    window.localStorage.setItem(TOKEN_KEY, issueMockToken(ADMIN_USERNAME, -1000));
    renderAt('/admin/articles');
    expect(screen.getByTestId('admin-login-page')).toBeInTheDocument();
  });

  it('lands on the requested page after signing in, not on the dashboard', async () => {
    signOutBeforeRender();
    const user = userEvent.setup();
    renderAt('/admin/articles');
    expect(screen.getByTestId('admin-login-page')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Identifiant'), ADMIN_USERNAME);
    await user.type(screen.getByLabelText('Mot de passe'), PASSWORD);
    await user.click(screen.getByRole('button', { name: 'Se connecter' }));

    expect(await screen.findByTestId('admin-articles-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-dashboard-page')).toBeNull();
  });

  it('bounces an already signed-in editor away from the login page', () => {
    renderAt('/admin/login');
    expect(screen.getByTestId('admin-dashboard-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-login-page')).toBeNull();
  });

  it('leaves the public site open to everyone', () => {
    signOutBeforeRender();
    renderAt('/films');
    expect(screen.queryByTestId('admin-login-page')).toBeNull();
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });

  it('renders the login page outside the admin shell', () => {
    signOutBeforeRender();
    renderAt('/admin/login');
    // No rail, no drawer: the admin nav is nowhere on the page.
    expect(screen.queryByRole('link', { name: 'Tableau de bord' })).toBeNull();
    expect(screen.queryByRole('link', { name: /Voir le site/ })).toBeNull();
  });
});
