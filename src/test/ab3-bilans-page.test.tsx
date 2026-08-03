import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminBilansPage from '../pages/AdminBilans';
import { useTestDb } from './api-server';

/**
 * The listing pages seven months at a time, so the catalogue needs more than a
 * page for the pager to mean anything: nine published months, plus the one in
 * progress. They are written out here rather than derived from the shared seed
 * because two of them are searched for by name.
 */
const PAGE_SIZE = 7;
const PUBLISHED = [
  ['2026-06', 2026, 6, 'Juin', 'Les longues soirées'],
  ['2026-05', 2026, 5, 'Mai', 'Le mois des seuils'],
  ['2026-04', 2026, 4, 'Avril', 'Les giboulées'],
  ['2026-03', 2026, 3, 'Mars', 'Le dégel'],
  ['2026-02', 2026, 2, 'Février', 'Le mois le plus court, les films les plus longs'],
  ['2026-01', 2026, 1, 'Janvier', 'Les bonnes résolutions de lecture'],
  ['2025-12', 2025, 12, 'Décembre', 'Le mois des listes'],
  ['2025-11', 2025, 11, 'Novembre', 'Les soirs qui tombent tôt'],
  ['2025-05', 2025, 5, 'Mai', 'Le tout premier bilan'],
] as const;

const CATALOGUE = `
${PUBLISHED.map(
  ([id, year, month, label, title], index) =>
    `INSERT INTO bilans (id,year,month,month_label,title,mood,status,published_at,views,likes)
     VALUES ('${id}',${year},${month},'${label}','${title}','Une humeur.','published','${id}-28',${1000 - index * 10},${50 - index});`,
).join('\n')}

INSERT INTO bilans (id,year,month,month_label,title,mood,status,updated_at,views,likes)
VALUES ('2026-07',2026,7,'Juillet','Le mois en cours','Encore en chantier.','draft','2026-07-20T09:00:00Z',0,0);

INSERT INTO bilan_counts (bilan_id,medium,count)
VALUES ('2026-07','film',1),('2026-07','serie',1),('2026-07','livre',1);
`;

const TOTAL_PUBLISHED = PUBLISHED.length;
/** The oldest published month, which the subtitle words as "depuis mai 2025". */
const SINCE = 'mai 2025';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminBilansPage />
    </MemoryRouter>,
  );
}

function rows() {
  return screen.getAllByTestId('admin-bilan-row');
}

async function loadedRows() {
  await screen.findAllByTestId('admin-bilan-row');
  return rows();
}

describe('AB-3 AdminBilansPage', () => {
  beforeEach(() => {
    useTestDb(CATALOGUE);
  });

  it('heads the page with the catalogue totals and the primary action', async () => {
    renderPage();
    expect(screen.getByTestId('admin-bilans-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bilans culturels');
    expect(
      await screen.findByText(`${TOTAL_PUBLISHED} bilans publiés · depuis ${SINCE}`),
    ).toBeInTheDocument();
    // A month is written once, and one is already in progress: there is
    // nothing to start, so neither the header button nor the FAB is offered.
    expect(screen.queryAllByRole('link', { name: 'Nouveau bilan' })).toHaveLength(0);
  });

  it('gives the month in progress its own card, above and outside the listing', async () => {
    renderPage();
    const card = await screen.findByTestId('current-bilan-card');
    expect(within(card).getByText('En cours')).toBeInTheDocument();
    expect(within(card).getByText(/^Modifié/)).toBeInTheDocument();
    expect(
      within(card).getByRole('heading', { name: 'Le mois en cours' }),
    ).toBeInTheDocument();
    // "le bilan" is the mobile half of the label — the wide banner drops it.
    expect(within(card).getByRole('link', { name: 'Reprendre le bilan' })).toHaveAttribute(
      'href',
      '/admin/bilans/2026-07',
    );
    // The card has the room to spell the tally out, unlike the table's chips
    // (the figure and its label are two nodes, hence the textContent match).
    expect(card).toHaveTextContent('1 film');
    expect(card).toHaveTextContent('1 série');
    expect(card).toHaveTextContent('1 livre');
    // A medium with no avis yet is simply absent from the tally.
    expect(card).not.toHaveTextContent('docs');
    // …and the month in progress is never repeated among the published ones.
    expect(rows().some((row) => within(row).queryByText('Le mois en cours'))).toBe(false);
  });

  it('renders one page of published months, each linking to its bilan', async () => {
    renderPage();
    expect(await loadedRows()).toHaveLength(PAGE_SIZE);

    for (const row of rows()) {
      const links = within(row).getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toMatch(/^\/admin\/bilans\/\d{4}-\d{2}$/);
      expect(within(row).getByText('Publié')).toBeInTheDocument();
    }
    expect(rows()[0]).toHaveTextContent('Juin 2026 - Les longues soirées');
  });

  it('searches by month or title and falls back to an empty state', async () => {
    const user = userEvent.setup();
    renderPage();
    await loadedRows();
    const search = screen.getByLabelText('Rechercher un bilan');

    // The month is searchable even though it left the title — and unaccented
    // input finds it, because the column and the term are folded alike.
    await user.type(search, 'fevrier');
    expect(
      await screen.findByText(/Février 2026 - Le mois le plus court/),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(1);

    await user.clear(search);
    await user.type(search, 'resolutions');
    expect(
      await screen.findByText(/Janvier 2026 - Les bonnes résolutions de lecture/),
    ).toBeInTheDocument();
    expect(rows()).toHaveLength(1);

    await user.clear(search);
    await user.type(search, 'zzz');
    expect(
      await screen.findByText('Aucun bilan ne correspond à cette recherche.'),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-bilan-row')).toHaveLength(0);
    // The month in progress is not a search result, so it stays put.
    expect(screen.getByTestId('current-bilan-card')).toBeInTheDocument();
  });

  it('pages through the catalogue and resets to page 1 when the query changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await loadedRows();
    // The pager counts the listing's rows — the card above it is not one.
    const pageCount = Math.ceil(TOTAL_PUBLISHED / PAGE_SIZE);

    expect(
      await screen.findByText(`${PAGE_SIZE} bilans sur ${TOTAL_PUBLISHED}`),
    ).toBeInTheDocument();
    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pager).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(pager).getByRole('button', { name: 'Page précédente' })).toBeDisabled();

    await user.click(within(pager).getByRole('button', { name: String(pageCount) }));
    await screen.findAllByTestId('admin-bilan-row');
    expect(rows()).toHaveLength(TOTAL_PUBLISHED - PAGE_SIZE * (pageCount - 1));

    // Changing the sort sends the listing back to the first page.
    await user.click(screen.getByRole('button', { name: /Plus récents/ }));
    await user.click(
      within(screen.getByRole('listbox', { name: 'Tri' })).getByRole('button', {
        name: 'Plus anciens',
      }),
    );
    await screen.findAllByTestId('admin-bilan-row');
    expect(
      within(screen.getByRole('navigation', { name: 'Pagination' })).getByRole('button', {
        name: '1',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(rows()[0]).toHaveTextContent('Mai 2025 - Le tout premier bilan');
  });
});
