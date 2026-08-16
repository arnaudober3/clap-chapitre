import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

// The pages these routes render read the API, so the suite needs content.
beforeEach(() => {
  useTestDb(SEED);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('AMS-4 admin Me suivre routing', () => {
  it('renders the editor inside the admin shell at /admin/me-suivre', async () => {
    renderAt('/admin/me-suivre');
    expect(await screen.findByTestId('admin-mesuivre-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-not-found-page')).toBeNull();
    // The public Me suivre page must not be the one that answered.
    expect(screen.queryByTestId('me-suivre-page')).toBeNull();
  });

  it('marks the rail entry as the current section', async () => {
    renderAt('/admin/me-suivre');
    const active = screen
      .getAllByRole('link', { name: 'Me suivre' })
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(active.length).toBeGreaterThan(0);
  });

  it('leaves the public page and the neighbouring editor untouched', async () => {
    const { unmount } = renderAt('/me-suivre');
    expect(await screen.findByTestId('me-suivre-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-mesuivre-page')).toBeNull();
    unmount();

    renderAt('/admin/a-propos');
    expect(await screen.findByTestId('admin-apropos-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-mesuivre-page')).toBeNull();
  });

  it('still falls back to the admin 404 for an unknown admin path', async () => {
    renderAt('/admin/inconnu');
    expect(screen.getByTestId('admin-not-found-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-mesuivre-page')).toBeNull();
  });
});
