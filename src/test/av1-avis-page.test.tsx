import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AvisArchivesPage from '../pages/AvisArchives';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

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

describe('AV-1 AvisArchivesPage', () => {
  beforeEach(() => {
    useTestDb(SEED);
  });

  it('renders the H1 and only the current medium’s avis, each linking to /article', async () => {
    renderAt('/archives/films');
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tous les avis' }),
    ).toBeInTheDocument();
    const grid = await screen.findByTestId('avis-grid');
    // The seed holds one published film.
    expect(within(grid).getAllByTestId('review-card')).toHaveLength(1);
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

  it('filters by the medium in the URL', async () => {
    renderAt('/archives/livres');
    const grid = await screen.findByTestId('avis-grid');
    expect(within(grid).getAllByTestId('review-card')).toHaveLength(1);
    expect(within(grid).getByRole('link', { name: /L’année de la pluie/ })).toBeInTheDocument();
    // The active tab reflects the route.
    expect(
      within(screen.getByRole('navigation')).getByRole('link', { name: 'Livres' }),
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
  it('renders the Salon empty state when the medium has no avis', async () => {
    // A medium with no rows, which no longer needs a stubbed module to produce:
    // the seed simply holds no doc.
    useTestDb(SEED);
    renderAt('/archives/docs');
    expect(
      await screen.findByText('Aucun avis pour ce média pour l’instant.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('avis-grid')).not.toBeInTheDocument();
  });
});