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

describe('AAP-3 admin À propos routing', () => {
  it('renders the editor inside the admin shell at /admin/a-propos', async () => {
    renderAt('/admin/a-propos');
    expect(await screen.findByTestId('admin-apropos-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-not-found-page')).toBeNull();
    // The public À propos page must not be the one that answered.
    expect(screen.queryByTestId('a-propos-page')).toBeNull();
  });

  it('marks the rail entry as the current section', async () => {
    renderAt('/admin/a-propos');
    const active = screen
      .getAllByRole('link', { name: 'À propos' })
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(active.length).toBeGreaterThan(0);
  });

  it('leaves the public page and the remaining admin sections untouched', async () => {
    const { unmount } = renderAt('/a-propos');
    // Wait for the content, then re-query: the page swaps its loading shell for
    // the real one, so the node found first is no longer the node on screen.
    await screen.findByTestId('a-propos-hero');
    expect(screen.getByTestId('a-propos-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-apropos-page')).toBeNull();
    unmount();

    // The neighbouring "Pages du site" editor answers for itself, and an
    // unknown admin path still lands on the admin 404.
    const second = renderAt('/admin/me-suivre');
    expect(await screen.findByTestId('admin-mesuivre-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-apropos-page')).toBeNull();
    second.unmount();

    renderAt('/admin/inconnu');
    expect(await screen.findByTestId('admin-not-found-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-apropos-page')).toBeNull();
  });
});
