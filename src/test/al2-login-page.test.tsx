import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { TOKEN_KEY, getToken } from '../auth/auth';
import { TEST_USERNAME as ADMIN_USERNAME, TEST_PASSWORD as PASSWORD } from './credentials';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

async function signIn(username: string, password: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText('Identifiant'), username);
  await user.type(screen.getByLabelText('Mot de passe'), password);
  await user.click(screen.getByRole('button', { name: 'Se connecter' }));
}

describe('AL-2 admin login page', () => {
  beforeEach(() => {
    // The suite runs signed in by default (see setup.ts); this page needs a
    // visitor who is not.
    window.localStorage.removeItem(TOKEN_KEY);
  });

  it('renders both credential fields and the submit button', () => {
    renderAt('/admin/login');
    expect(screen.getByTestId('admin-login-page')).toBeInTheDocument();
    expect(screen.getByLabelText('Identifiant')).toHaveAttribute('type', 'text');
    expect(screen.getByLabelText('Mot de passe')).toHaveAttribute(
      'type',
      'password',
    );
    expect(screen.getByRole('button', { name: 'Se connecter' })).toBeInTheDocument();
  });

  it('offers a way back to the public site', () => {
    renderAt('/admin/login');
    expect(screen.getByRole('link', { name: /Retour au site/ })).toHaveAttribute(
      'href',
      '/',
    );
  });

  it('announces an error and stores no token on wrong credentials', async () => {
    renderAt('/admin/login');
    await signIn(ADMIN_USERNAME, 'mauvais-mot-de-passe');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Identifiants incorrects.',
    );
    expect(getToken()).toBeNull();
    expect(screen.getByTestId('admin-login-page')).toBeInTheDocument();
    // The password field is emptied so the next attempt starts clean.
    expect(screen.getByLabelText('Mot de passe')).toHaveValue('');
  });

  it('signs in with the right credentials and stores the token', async () => {
    renderAt('/admin/login');
    await signIn(ADMIN_USERNAME, PASSWORD);

    expect(await screen.findByTestId('admin-dashboard-page')).toBeInTheDocument();
    expect(getToken()).not.toBeNull();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('shows no error before the first attempt', () => {
    renderAt('/admin/login');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
