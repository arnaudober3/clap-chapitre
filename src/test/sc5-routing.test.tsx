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

describe('SC-5 routing', () => {
  const cases: Array<[string, RegExp]> = [
    ['/films', /Avis récents/],
    ['/series', /Avis récents/],
    ['/livres', /Avis récents/],
    ['/docs', /Avis récents/],
    ['/article/42', /Avis/],
    ['/a-propos', /À propos/],
    ['/me-suivre', /Me suivre/],
  ];

  it.each(cases)('renders the placeholder heading for %s inside the Layout', (path, heading) => {
    renderAt(path);
    // Layout chrome present (brand "et"), plus the page heading.
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: heading })).toBeInTheDocument();
  });

  it('renders the Bilan culturel page inside the Layout for /bilan-culturel', () => {
    renderAt('/bilan-culturel');
    // Layout chrome present (brand "et"), plus the real design-2a page. Per the
    // design, "Bilan culturel" is an eyebrow (not a heading) — the H1 is the month.
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    const page = screen.getByTestId('bilan-culturel-page');
    // "Bilan culturel" also appears as a nav link in the Layout — scope to the page eyebrow.
    expect(within(page).getByText('Bilan culturel')).toBeInTheDocument();
  });

  it('renders the AvisArchives archive inside the Layout for /archives', () => {
    renderAt('/archives');
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    const page = screen.getByTestId('avis-archives-page');
    expect(
      within(page).getByRole('heading', { level: 1, name: 'Tous les avis' }),
    ).toBeInTheDocument();
  });

  it('renders the BilanCulturelArchives page inside the Layout for /bilan-culturel/archives', () => {
    renderAt('/bilan-culturel/archives');
    // Layout chrome present (brand "et"), plus the real design-2b page. Per the
    // design, "Bilan culturel" is an eyebrow — the H1 is "Tous les bilans".
    expect(screen.getAllByText('et').length).toBeGreaterThan(0);
    const page = screen.getByTestId('bilan-culturel-archives-page');
    expect(
      within(page).getByRole('heading', { level: 1, name: 'Tous les bilans' }),
    ).toBeInTheDocument();
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
