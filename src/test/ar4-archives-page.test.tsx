import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BilanCulturelArchivesPage from '../pages/BilanCulturelArchives';
import { useTestDb } from './api-server';

/** Two years, so one can be expanded while the other stays collapsed. */
const ARCHIVE = `
INSERT INTO bilans (id,year,month,month_label,title,mood,status,published_at,views,likes)
VALUES ('2026-07',2026,7,'Juillet','Les longues soirées','Une humeur.','published','2026-08-02',10,1),
       ('2026-06',2026,6,'Juin','Les jours longs','Une humeur.','published','2026-07-02',10,1),
       ('2025-12',2025,12,'Décembre','Le mois des listes','Une humeur.','published','2026-01-02',10,1);
`;

const newest = { year: 2026, months: 2 };
const older = { year: 2025, months: 1 };
const latestBilan = () => ({ id: '2026-07' });

beforeEach(() => {
  useTestDb(ARCHIVE);
});

function wrap(ui: React.ReactElement) {
  return render(<MemoryRouter>{ui}</MemoryRouter>);
}

/** Find the YearSection whose header shows the given year label. */
function sectionForYear(year: number): HTMLElement {
  const headers = screen.getAllByTestId('year-header');
  const header = headers.find((h) => h.textContent?.includes(String(year)));
  if (!header) throw new Error(`no year header for ${year}`);
  return header.closest('[data-testid="year-section"]') as HTMLElement;
}

describe('AR-4 ArchivesPage', () => {
  it('shows the H1, the back link, and the newest year expanded / older collapsed', async () => {
    wrap(<BilanCulturelArchivesPage />);
    expect(
      screen.getByRole('heading', { level: 1, name: 'Tous les bilans' }),
    ).toBeInTheDocument();
    await screen.findAllByTestId('year-section');

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
    ).toBe(newest.months);
    // Older year collapsed: no MonthCards.
    const olderSection = sectionForYear(older.year);
    expect(
      within(olderSection).queryByTestId('month-card'),
    ).not.toBeInTheDocument();
  });

  it('expanding an older year does not collapse the already-open newest year', async () => {
    const user = userEvent.setup();
    wrap(<BilanCulturelArchivesPage />);
    await screen.findAllByTestId('year-section');

    const olderHeader = within(sectionForYear(older.year)).getByTestId(
      'year-header',
    );
    await user.click(olderHeader);

    // Older year now shows its cards…
    expect(
      within(sectionForYear(older.year)).getAllByTestId('month-card').length,
    ).toBe(older.months);
    // …and the newest year is still expanded.
    expect(
      within(sectionForYear(newest.year)).getAllByTestId('month-card').length,
    ).toBe(newest.months);

    // Clicking the expanded newest year collapses it.
    const newestHeader = within(sectionForYear(newest.year)).getByTestId(
      'year-header',
    );
    await user.click(newestHeader);
    expect(
      within(sectionForYear(newest.year)).queryByTestId('month-card'),
    ).not.toBeInTheDocument();
  });

  it('every rendered month card links to /bilan-culturel?mois=<id> and the newest shows "dernier"', async () => {
    wrap(<BilanCulturelArchivesPage />);
    const cards = await screen.findAllByTestId('month-card');
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
  it('renders the empty state, omits the back link and renders no YearSection', async () => {
    // An empty database, which is what the site ships with.
    useTestDb();
    render(
      <MemoryRouter>
        <BilanCulturelArchivesPage />
      </MemoryRouter>,
    );

    expect(await screen.findByText('Aucun bilan archivé pour l’instant.')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Revenir au dernier bilan/ })).toBeNull();
    expect(screen.queryByTestId('year-section')).toBeNull();
  });
});
