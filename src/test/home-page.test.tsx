import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../pages/Home';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

/**
 * The page reads `/api/feed`, which the stub serves from a real SQLite database
 * carrying the project's migrations — so these assertions go through the hook,
 * the handler and the SQL, not around them. Everything is therefore awaited:
 * nothing is on screen on the first render but the loading line.
 */
function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/films" element={<HomePage />} />
        <Route path="/series" element={<HomePage />} />
        <Route path="/livres" element={<HomePage />} />
        <Route path="/docs" element={<HomePage />} />
        <Route path="/" element={<HomePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('HM-6 HomePage', () => {
  beforeEach(() => {
    useTestDb(SEED);
  });

  it('shows the newest review as hero and the rest as grid cards at /', async () => {
    renderAt('/');
    const hero = await screen.findByTestId('home-hero');
    // The seed's newest avis, all media mixed.
    expect(within(hero).getByText('Un dernier été')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /L’année de la pluie/ })).toBeInTheDocument();
    // A draft is not published, so it never reaches the feed.
    expect(screen.queryByText('Contre-champs')).not.toBeInTheDocument();
  });

  it('limits hero and grid to a single medium on /livres', async () => {
    renderAt('/livres');
    const page = await screen.findByTestId('home-page');
    expect(page).toHaveAttribute('data-medium', 'livre');

    const hero = await screen.findByTestId('home-hero');
    expect(within(hero).getByText('L’année de la pluie')).toBeInTheDocument();
    expect(screen.queryByText('Un dernier été')).not.toBeInTheDocument();
  });

  it('renders the empty state and no hero when the medium has no items', async () => {
    // No stubbing needed any more: a medium with no rows is just a medium with
    // no rows — which is also what the whole site looks like before the editor
    // has written anything.
    renderAt('/docs');
    expect(
      await screen.findByText('Aucun avis pour ce médium pour l’instant.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('home-hero')).not.toBeInTheDocument();
    // Exactly once: the grid hides itself when there is nothing in it, so it
    // does not repeat the hero's message.
    expect(screen.getAllByText('Aucun avis pour ce médium pour l’instant.')).toHaveLength(1);
    expect(screen.queryByText('Avis récents')).not.toBeInTheDocument();
  });

  it('shows the loading line before the feed arrives, and no empty state', () => {
    renderAt('/films');
    expect(screen.getByTestId('page-loading')).toBeInTheDocument();
    // The distinction that did not exist when the data was an import: "not yet"
    // must not read as "there is nothing".
    expect(
      screen.queryByText('Aucun avis pour ce médium pour l’instant.'),
    ).not.toBeInTheDocument();
  });
});
