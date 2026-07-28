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

describe('AAP-3 admin À propos routing', () => {
  it('renders the editor inside the admin shell at /admin/a-propos', () => {
    renderAt('/admin/a-propos');
    expect(screen.getByTestId('admin-apropos-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-placeholder-page')).toBeNull();
    // The public À propos page must not be the one that answered.
    expect(screen.queryByTestId('a-propos-page')).toBeNull();
  });

  it('marks the rail entry as the current section', () => {
    renderAt('/admin/a-propos');
    const active = screen
      .getAllByRole('link', { name: 'À propos' })
      .filter((link) => link.getAttribute('aria-current') === 'page');
    expect(active.length).toBeGreaterThan(0);
  });

  it('leaves the public page and the remaining admin sections untouched', () => {
    const { unmount } = renderAt('/a-propos');
    expect(screen.getByTestId('a-propos-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-apropos-page')).toBeNull();
    unmount();

    renderAt('/admin/me-suivre');
    expect(screen.getByTestId('admin-placeholder-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-apropos-page')).toBeNull();
  });
});
