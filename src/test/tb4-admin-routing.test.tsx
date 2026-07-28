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

describe('TB-4 admin routing', () => {
  it('renders the dashboard inside the admin shell at /admin (not the public Layout)', () => {
    renderAt('/admin');
    expect(screen.getByTestId('admin-dashboard-page')).toBeInTheDocument();
    // The public brand renders a standalone italic "et" node; the admin shell
    // does not — proof the public Layout is not mounted here.
    expect(screen.queryByText('et')).toBeNull();
  });

  it('lands still-unbuilt admin sections on the shared placeholder', () => {
    renderAt('/admin/a-propos');
    const page = screen.getByTestId('admin-placeholder-page');
    expect(page).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('À propos');
  });

  it('routes unknown /admin/** paths to the placeholder, not the public 404', () => {
    renderAt('/admin/zzz');
    expect(screen.getByTestId('admin-placeholder-page')).toBeInTheDocument();
    expect(screen.queryByTestId('not-found-page')).toBeNull();
  });
});
