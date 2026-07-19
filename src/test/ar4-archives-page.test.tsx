import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ArchivesPage from '../pages/Archives';
import { bilansByYear, latestBilan } from '../mock/bilans';

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

const years = bilansByYear();
const newest = years[0];
const older = years[1];

/** Find the YearSection whose header shows the given year label. */
function sectionForYear(year: number): HTMLElement {
  const headers = screen.getAllByTestId('year-header');
  const header = headers.find((h) => h.textContent?.includes(String(year)));
  if (!header) throw new Error(`no year header for ${year}`);
  return header.closest('[data-testid="year-section"]') as HTMLElement;
}

describe('AR-4 ArchivesPage', () => {
  it('shows the H1, the back link, and the newest year expanded / older collapsed', () => {
    wrap(<ArchivesPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tous les bilans' }),
    ).toBeInTheDocument();

    const back = screen.getByRole('link', {
      name: /Revenir au dernier bilan/,
    });
    expect(back).toHaveAttribute(
      'href',
      `/bilan-culturel?mois=${latestBilan().id}`,
    );

    // Newest year expanded: its MonthCards visible.
    const newestSection = sectionForYear(newest.year);
    expect(
      within(newestSection).getAllByTestId('month-card').length,
    ).toBe(newest.months.length);
    // Older year collapsed: no MonthCards.
    const olderSection = sectionForYear(older.year);
    expect(
      within(olderSection).queryByTestId('month-card'),
    ).not.toBeInTheDocument();
  });

  it('expanding an older year does not collapse the already-open newest year', async () => {
    const user = userEvent.setup();
    wrap(<ArchivesPage />);

    const olderHeader = within(sectionForYear(older.year)).getByTestId(
      'year-header',
    );
    await user.click(olderHeader);

    // Older year now shows its cards…
    expect(
      within(sectionForYear(older.year)).getAllByTestId('month-card').length,
    ).toBe(older.months.length);
    // …and the newest year is still expanded.
    expect(
      within(sectionForYear(newest.year)).getAllByTestId('month-card').length,
    ).toBe(newest.months.length);

    // Clicking the expanded newest year collapses it.
    const newestHeader = within(sectionForYear(newest.year)).getByTestId(
      'year-header',
    );
    await user.click(newestHeader);
    expect(
      within(sectionForYear(newest.year)).queryByTestId('month-card'),
    ).not.toBeInTheDocument();
  });

  it('every rendered month card links to /bilan-culturel?mois=<id> and the newest shows "dernier"', () => {
    wrap(<ArchivesPage />);
    const cards = screen.getAllByTestId('month-card');
    for (const card of cards) {
      expect(card.getAttribute('href')).toMatch(
        /^\/bilan-culturel\?mois=\d{4}-\d{2}$/,
      );
    }
    const latestCard = cards.find(
      (c) =>
        c.getAttribute('href') ===
        `/bilan-culturel?mois=${latestBilan().id}`,
    );
    expect(latestCard).toBeDefined();
    expect(
      within(latestCard as HTMLElement).getByTestId('dernier-pill'),
    ).toBeInTheDocument();
  });
});

describe('AR-4 ArchivesPage empty state', () => {
  afterEach(() => {
    vi.doUnmock('../mock/bilans');
    vi.resetModules();
  });

  it('renders the empty state, omits the back link and renders no YearSection', async () => {
    vi.resetModules();
    vi.doMock('../mock/bilans', () => ({
      bilans: [],
      bilansByYear: () => [],
      latestBilan: () => {
        throw new Error('should not be called when bilans is empty');
      },
      bilanById: () => undefined,
    }));
    const { default: EmptyPage } = await import('../pages/Archives');
    render(
      <MemoryRouter>
        <EmptyPage />
      </MemoryRouter>,
    );
    expect(
      screen.getByText('Aucun bilan archivé pour l’instant.'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('link', { name: /Revenir au dernier bilan/ }),
    ).not.toBeInTheDocument();
    expect(screen.queryByTestId('year-section')).not.toBeInTheDocument();
  });
});
