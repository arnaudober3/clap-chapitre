import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('AB-4 admin bilans routing', () => {
  it('renders the listing inside the admin shell at /admin/bilans', () => {
    renderAt('/admin/bilans');
    expect(screen.getByTestId('admin-bilans-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-placeholder-page')).toBeNull();
    // The public bilan page must not be the one that answered.
    expect(screen.queryByTestId('bilan-culturel-page')).toBeNull();
  });

  it('marks the rail entry as the current section', () => {
    renderAt('/admin/bilans');
    const active = screen
      .getAllByRole('link', { name: /Bilans culturels/ })
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(active.length).toBeGreaterThan(0);
  });

  it('renders the editor inside the admin shell for a new bilan and for a month', () => {
    for (const path of ['/admin/bilans/nouveau', '/admin/bilans/2026-07']) {
      const { unmount } = renderAt(path);
      expect(screen.getByTestId('admin-bilan-form-page')).toBeInTheDocument();
      expect(screen.queryByTestId('admin-placeholder-page')).toBeNull();
      expect(screen.queryByTestId('not-found-page')).toBeNull();
      unmount();
    }
  });

  it('keeps naming the section in the shell header while the editor is open', () => {
    renderAt('/admin/bilans/2026-07');
    // Same reading as the article form: the shell says which section you are
    // in, the page's own breadcrumb says what you are editing.
    const header = within(screen.getByRole('banner'));
    expect(header.getAllByText('Bilans culturels').length).toBeGreaterThan(0);
    expect(header.queryByText('Un mois à contre-courant')).toBeNull();
  });

  it('sends an unknown month back to the listing', () => {
    renderAt('/admin/bilans/2099-99');
    expect(screen.getByTestId('admin-bilans-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-bilan-form-page')).toBeNull();
  });
});
