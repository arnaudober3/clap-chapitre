import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AvisArchivesPage from '../pages/AvisArchives';
import { feed } from '../mock/home';

/** Render the archive at a given path, with the /archives/:medium route wired. */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/archives/:medium" element={<AvisArchivesPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const filmCount = feed.filter((i) => i.medium === 'film').length;
const serieCount = feed.filter((i) => i.medium === 'serie').length;

describe('AV-1 AvisArchivesPage', () => {
  it('renders the H1 and only the current medium’s avis, each linking to /article', () => {
    renderAt('/archives/films');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tous les avis' }),
    ).toBeInTheDocument();
    const grid = screen.getByTestId('avis-grid');
    expect(within(grid).getAllByTestId('review-card')).toHaveLength(filmCount);
    for (const card of within(grid).getAllByTestId('review-card')) {
      expect(card.getAttribute('href')).toMatch(/^\/article\//);
    }
  });

  it('has one tab per medium (no "Tous"), links to /archives/<segment>, marks the active one', () => {
    renderAt('/archives/films');
    const nav = screen.getByRole('navigation', { name: 'Filtrer par média' });
    const tabs = within(nav).getAllByRole('link');
    // Exactly the four media — no "Tous".
    expect(tabs).toHaveLength(4);
    expect(within(nav).queryByText('Tous')).not.toBeInTheDocument();

    const films = within(nav).getByRole('link', { name: 'Films' });
    expect(films).toHaveAttribute('href', '/archives/films');
    expect(films).toHaveAttribute('aria-current', 'page');

    const series = within(nav).getByRole('link', { name: 'Séries' });
    expect(series).toHaveAttribute('href', '/archives/series');
    expect(series).not.toHaveAttribute('aria-current');
  });

  it('filters by the medium in the URL', () => {
    renderAt('/archives/series');
    expect(serieCount).toBeGreaterThan(0);
    const grid = screen.getByTestId('avis-grid');
    expect(within(grid).getAllByTestId('review-card')).toHaveLength(serieCount);
    // The active tab reflects the route.
    expect(
      within(screen.getByRole('navigation')).getByRole('link', { name: 'Séries' }),
    ).toHaveAttribute('aria-current', 'page');
  });

  it('redirects an unknown segment to the default medium', () => {
    renderAt('/archives/inconnu');
    // Redirect resolves to /archives/films → films content.
    expect(screen.getByTestId('avis-archives-page')).toHaveAttribute(
      'data-medium',
      'film',
    );
  });
});

describe('AV-1 AvisArchivesPage empty state', () => {
  afterEach(() => {
    vi.doUnmock('../mock/home');
    vi.resetModules();
  });

  it('renders the Salon empty state when the medium has no avis', async () => {
    vi.resetModules();
    vi.doMock('../mock/home', () => ({
      feed: [],
      latestFor: () => undefined,
      recentFor: () => [],
    }));
    const { default: EmptyAvis } = await import('../pages/AvisArchives');
    render(
      <MemoryRouter initialEntries={['/archives/films']}>
        <Routes>
          <Route path="/archives/:medium" element={<EmptyAvis />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(
      screen.getByText('Aucun avis pour ce média pour l’instant.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('avis-grid')).not.toBeInTheDocument();
  });
});