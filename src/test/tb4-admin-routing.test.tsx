import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../App';
import { adminNav } from '../components/layout/adminNav';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('TB-4 admin routing', () => {
  it('renders the dashboard inside the admin shell at /admin (not the public Layout)', () => {
    renderAt('/admin');
    expect(screen.getByTestId('admin-dashboard-page')).toBeInTheDocument();
    // The public brand renders a standalone italic "et" node; the admin shell
    // does not — proof the public Layout is not mounted here.
    expect(screen.queryByText('et')).toBeNull();
  });

  // Every nav destination is now built ("Me suivre" was the last one), so the
  // 404 is reachable through unknown paths only — see the test below.
  it('leaves no admin nav destination on the 404', () => {
    for (const item of adminNav) {
      const { unmount } = renderAt(item.to);
      expect(screen.queryByTestId('admin-not-found-page'), item.to).toBeNull();
      unmount();
    }
  });

  it('answers an unknown /admin/** path with the admin 404, not the public one', () => {
    renderAt('/admin/zzz');
    const page = screen.getByTestId('admin-not-found-page');
    // Same affiche as the public 404, one way out, and the rail is still there.
    expect(
      within(page).getByRole('heading', { name: /Ce chapitre reste à écrire/ }),
    ).toBeInTheDocument();
    expect(
      within(page).getByRole('link', { name: 'Retour au dashboard' }),
    ).toHaveAttribute('href', '/admin');
    expect(within(page).getAllByRole('link')).toHaveLength(1);
    expect(screen.queryByTestId('not-found-page')).toBeNull();
  });
});
