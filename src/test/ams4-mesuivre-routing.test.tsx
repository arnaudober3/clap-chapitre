import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('AMS-4 admin Me suivre routing', () => {
  it('renders the editor inside the admin shell at /admin/me-suivre', () => {
    renderAt('/admin/me-suivre');
    expect(screen.getByTestId('admin-mesuivre-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-not-found-page')).toBeNull();
    // The public Me suivre page must not be the one that answered.
    expect(screen.queryByTestId('me-suivre-page')).toBeNull();
  });

  it('marks the rail entry as the current section', () => {
    renderAt('/admin/me-suivre');
    const active = screen
      .getAllByRole('link', { name: 'Me suivre' })
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(active.length).toBeGreaterThan(0);
  });

  it('leaves the public page and the neighbouring editor untouched', () => {
    const { unmount } = renderAt('/me-suivre');
    expect(screen.getByTestId('me-suivre-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-mesuivre-page')).toBeNull();
    unmount();

    renderAt('/admin/a-propos');
    expect(screen.getByTestId('admin-apropos-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-mesuivre-page')).toBeNull();
  });

  it('still falls back to the admin 404 for an unknown admin path', () => {
    renderAt('/admin/inconnu');
    expect(screen.getByTestId('admin-not-found-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-mesuivre-page')).toBeNull();
  });
});
