import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { Article } from '../mock/types';
import type { MonthlyBilan } from '../mock/bilans';
import MonthCard from '../pages/Archives/MonthCard';

function avis(id: string, cover = 'linear-gradient(150deg,#111,#222)'): Article {
  return {
    id,
    title: `Titre ${id}`,
    medium: 'film',
    excerpt: 'Un excerpt.',
    cover,
    date: '1 juin 2026',
    author: 'Marie-Zoé',
    likes: 10,
    comments: 2,
  };
}

function bilan(overrides: Partial<MonthlyBilan> = {}): MonthlyBilan {
  return {
    id: '2026-06',
    year: 2026,
    month: 6,
    monthLabel: 'Juin',
    avis: [avis('a'), avis('b'), avis('c'), avis('d')],
    ...overrides,
  };
}

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

describe('AR-2 MonthCard', () => {
  it('renders exactly 3 tiles, the monthLabel and a count, and links to the bilan', () => {
    wrap(<MonthCard bilan={bilan()} />);
    const card = screen.getByTestId('month-card');
    expect(within(card).getAllByTestId('poster-thumb')).toHaveLength(3);
    expect(within(card).getByText('Juin')).toBeInTheDocument();
    // Count reads the avis length (4 here), not the tile count.
    expect(within(card).getByText('4 avis')).toBeInTheDocument();
    expect(card).toHaveAttribute('href', '/bilan-culturel?mois=2026-06');
  });

  it('shows the "dernier" pill only when isLatest is true', () => {
    const { rerender } = wrap(<MonthCard bilan={bilan()} isLatest />);
    expect(screen.getByTestId('dernier-pill')).toHaveTextContent('dernier');
    rerender(
      <MemoryRouter>
        <MonthCard bilan={bilan()} isLatest={false} />
      </MemoryRouter>,
    );
    expect(screen.queryByTestId('dernier-pill')).not.toBeInTheDocument();
  });

  it('renders exactly 1 tile for a 1-avis month, and 0 tiles + "0 avis" for empty', () => {
    wrap(<MonthCard bilan={bilan({ avis: [avis('solo')] })} />);
    expect(screen.getAllByTestId('poster-thumb')).toHaveLength(1);
    expect(screen.getByText('1 avis')).toBeInTheDocument();

    const { container } = wrap(<MonthCard bilan={bilan({ avis: [] })} />);
    expect(within(container).queryByTestId('poster-thumb')).toBeNull();
    expect(within(container).getByText('0 avis')).toBeInTheDocument();
    expect(within(container).queryByTestId('month-card-collage')).toBeNull();
  });
});
