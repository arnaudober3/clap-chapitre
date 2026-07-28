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

  it('lands the bilan editor on the placeholder, still inside the admin shell', () => {
    renderAt('/admin/bilans/nouveau');
    expect(screen.getByTestId('admin-placeholder-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bilans culturels');
    expect(screen.queryByTestId('not-found-page')).toBeNull();
  });
});
