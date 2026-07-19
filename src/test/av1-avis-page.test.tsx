import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AvisArchivesPage from '../pages/AvisArchives';
import { feed } from '../mock/home';

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const filmCount = feed.filter((i) => i.medium === 'film').length;

describe('AV-1 AvisPage', () => {
  it('renders the H1 and one review card per avis (newest-first feed)', () => {
    wrap(<AvisArchivesPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tous les avis' }),
    ).toBeInTheDocument();
    const grid = screen.getByTestId('avis-grid');
    expect(within(grid).getAllByTestId('review-card')).toHaveLength(feed.length);
    // Each card deep-links to its avis.
    for (const card of within(grid).getAllByTestId('review-card')) {
      expect(card.getAttribute('href')).toMatch(/^\/article\//);
    }
  });

  it('filters the list to a single medium and marks the active pill', async () => {
    const user = userEvent.setup();
    wrap(<AvisArchivesPage />);
    expect(filmCount).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Films' }));

    expect(screen.getByRole('button', { name: 'Films' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Tous' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    const grid = screen.getByTestId('avis-grid');
    expect(within(grid).getAllByTestId('review-card')).toHaveLength(filmCount);

    // Back to "Tous" shows the whole feed again.
    await user.click(screen.getByRole('button', { name: 'Tous' }));
    expect(within(screen.getByTestId('avis-grid')).getAllByTestId('review-card')).toHaveLength(
      feed.length,
    );
  });
});

describe('AV-1 AvisPage empty state', () => {
  afterEach(() => {
    vi.doUnmock('../mock/home');
    vi.resetModules();
  });

  it('renders the Salon empty state when the feed is empty', async () => {
    vi.resetModules();
    vi.doMock('../mock/home', () => ({
      feed: [],
      latestFor: () => undefined,
      recentFor: () => [],
    }));
    const { default: EmptyAvis } = await import('../pages/AvisArchives');
    render(
      <MemoryRouter>
        <EmptyAvis />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('Aucun avis pour ce média pour l’instant.'),
    ).toBeInTheDocument();
    expect(screen.queryByTestId('avis-grid')).not.toBeInTheDocument();
  });
});