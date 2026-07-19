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

describe('SC-5 routing', () => {
  const cases: Array<[string, RegExp]> = [
    ['/films', /Avis récents/],
    ['/series', /Avis récents/],
    ['/livres', /Avis récents/],
    ['/docs', /Avis récents/],
    ['/article/42', /Avis/],
    ['/bilan-culturel', /Bilan culturel/],
    ['/archives', /Archives/],
    ['/a-propos', /À propos/],
    ['/me-suivre', /Me suivre/],
  ];

  it.each(cases)('renders the placeholder heading for %s inside the Layout', (path, heading) => {
    renderAt(path);
    // Layout chrome present (brand "et"), plus the page heading.
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('redirects / to /films with the Films nav item active', () => {
    renderAt('/');
    // The rail and the mobile medium tab strip both render a "Films" link, so
    // assert that at least one of them carries the active state.
    const filmsLinks = screen.getAllByRole('link', { name: 'Films' });
    expect(filmsLinks.some((link) => link.getAttribute('aria-current') === 'page')).toBe(true);
  });

  it('renders NotFound for an unknown route', () => {
    renderAt('/n-existe-pas');
    expect(screen.getByRole('heading', { name: /Page introuvable/ })).toBeInTheDocument();
  });

  it('marks the Home page with the "livre" medium on /livres', () => {
    renderAt('/livres');
    expect(screen.getByTestId('home-page')).toHaveAttribute('data-medium', 'livre');
  });
});
