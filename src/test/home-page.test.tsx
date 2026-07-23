import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HomePage from '../pages/Home';
import { latestFor, recentFor } from '../mock/home';

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
  it('shows the newest overall review as hero and at least three grid cards at /', () => {
    renderAt('/');
    const hero = screen.getByTestId('home-hero');
    expect(within(hero).getByText(latestFor(undefined)!.title)).toBeInTheDocument();
    const cards = recentFor(undefined);
    expect(cards.length).toBeGreaterThanOrEqual(3);
    for (const item of cards.slice(0, 3)) {
      expect(
        screen.getByRole('link', { name: new RegExp(item.title) }),
      ).toBeInTheDocument();
    }
  });

  it('limits hero and grid to a single medium on /livres', () => {
    renderAt('/livres');
    const page = screen.getByTestId('home-page');
    expect(page).toHaveAttribute('data-medium', 'livre');
    const hero = screen.getByTestId('home-hero');
    expect(within(hero).getByText(latestFor('livre')!.title)).toBeInTheDocument();
    // Every grid card is a livre (its /article link matches a livre id).
    const livreIds = new Set(recentFor('livre').map((i) => i.id));
    const otherMedium = recentFor(undefined).find((i) => i.medium !== 'livre');
    expect(otherMedium).toBeTruthy();
    expect(
      screen.queryByRole('link', { name: new RegExp(otherMedium!.title) }),
    ).not.toBeInTheDocument();
    for (const item of recentFor('livre')) {
      const link = screen.getByRole('link', { name: new RegExp(item.title) });
      expect(link).toHaveAttribute('href', `/article/${item.id}`);
      expect(livreIds.has(item.id)).toBe(true);
    }
  });

  it('renders the empty state and no hero when the medium has no items', async () => {
    // The mock feed guarantees every medium, so exercise the defensive branch
    // by stubbing the selectors to report an empty medium.
    vi.resetModules();
    vi.doMock('../mock/home', () => ({
      feed: [],
      latestFor: () => undefined,
      recentFor: () => [],
    }));
    const { default: EmptyHome } = await import('../pages/Home');
    render(
      <MemoryRouter initialEntries={['/docs']}>
        <Routes>
          <Route path="/docs" element={<EmptyHome />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('home-hero')).not.toBeInTheDocument();
    // The empty message appears exactly once: the recent grid is hidden when
    // there are no items, so it no longer duplicates the hero's empty state.
    expect(
      screen.getAllByText('Aucun avis pour ce médium pour l’instant.'),
    ).toHaveLength(1);
    expect(screen.queryByText('Avis récents')).not.toBeInTheDocument();
    vi.doUnmock('../mock/home');
    vi.resetModules();
  });
});
