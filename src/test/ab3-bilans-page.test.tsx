import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminBilansPage from '../pages/AdminBilans';
import {
  adminBilanCounts,
  currentDraftBilan,
  filterAdminBilans,
  DEFAULT_QUERY,
  PAGE_SIZE,
} from '../mock/adminBilans';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminBilansPage />
    </MemoryRouter>,
  );
}

const counts = adminBilanCounts();
const draft = currentDraftBilan()!;
const firstPage = filterAdminBilans(DEFAULT_QUERY).slice(0, PAGE_SIZE);

/** What a row's link reads: the month a bilan covers, then its editorial title. */
function rowLabel(bilan: { monthLabel: string; year: number; title: string }) {
  return `${bilan.monthLabel} ${bilan.year} — ${bilan.title}`;
}

function rows() {
  return screen.getAllByTestId('admin-bilan-row');
}

describe('AB-3 AdminBilansPage', () => {
  it('heads the page with the catalogue totals and the primary action', () => {
    renderPage();
    expect(screen.getByTestId('admin-bilans-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Bilans culturels');
    expect(
      screen.getByText(`${counts.published} bilans publiés · depuis ${counts.sinceLabel}`),
    ).toBeInTheDocument();
    // A month is written once, and one is already in progress: there is
    // nothing to start, so neither the header button nor the FAB is offered.
    expect(screen.queryAllByRole('link', { name: 'Nouveau bilan' })).toHaveLength(0);
  });

  it('gives the month in progress its own card, above and outside the listing', () => {
    renderPage();
    const card = screen.getByTestId('current-bilan-card');
    expect(within(card).getByText('En cours')).toBeInTheDocument();
    expect(within(card).getByText(draft.updatedLabel)).toBeInTheDocument();
    expect(within(card).getByRole('heading', { name: draft.title })).toBeInTheDocument();
    // "le bilan" is the mobile half of the label — the wide banner drops it.
    expect(within(card).getByRole('link', { name: 'Reprendre le bilan' })).toHaveAttribute(
      'href',
      `/admin/bilans/${draft.id}`,
    );
    // The card has the room to spell the tally out, unlike the table's chips
    // (the figure and its label are two nodes, hence the textContent match).
    expect(card).toHaveTextContent('1 film');
    expect(card).toHaveTextContent('1 série');
    expect(card).toHaveTextContent('1 livre');
    // A medium with no avis yet is simply absent from the tally.
    expect(card).not.toHaveTextContent('docs');
    // …and it is never repeated among the published months.
    expect(rows().some((row) => within(row).queryByText(draft.title))).toBe(false);
  });

  it('renders one page of published months, each linking to its bilan', () => {
    renderPage();
    expect(rows()).toHaveLength(PAGE_SIZE);
    const titles = rows().map((row) => within(row).getAllByRole('link')[0].textContent);
    expect(titles).toEqual(firstPage.map(rowLabel));

    for (const row of rows()) {
      const links = within(row).getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toMatch(/^\/admin\/bilans\/\d{4}-\d{2}$/);
      expect(within(row).getByText('Publié')).toBeInTheDocument();
    }
  });

  it('searches by month or title and falls back to an empty state', async () => {
    const user = userEvent.setup();
    renderPage();
    const search = screen.getByLabelText('Rechercher un bilan');

    // The month is searchable even though it left the title.
    await user.type(search, 'fevrier');
    expect(rows()).toHaveLength(1);
    expect(
      screen.getByText('Février 2026 — Le mois le plus court, les films les plus longs'),
    ).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'resolutions');
    expect(rows()).toHaveLength(1);
    expect(screen.getByText('Janvier 2026 — Les bonnes résolutions de lecture')).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, 'zzz');
    expect(screen.queryAllByTestId('admin-bilan-row')).toHaveLength(0);
    expect(
      screen.getByText('Aucun bilan ne correspond à cette recherche.'),
    ).toBeInTheDocument();
    // The month in progress is not a search result, so it stays put.
    expect(screen.getByTestId('current-bilan-card')).toBeInTheDocument();
  });

  it('pages through the catalogue and resets to page 1 when the query changes', async () => {
    const user = userEvent.setup();
    renderPage();
    // The pager counts the listing's rows — the card above it is not one.
    const pageCount = Math.ceil(counts.published / PAGE_SIZE);

    expect(
      screen.getByText(`${PAGE_SIZE} bilans sur ${counts.published}`),
    ).toBeInTheDocument();
    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pager).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(pager).getByRole('button', { name: 'Page précédente' })).toBeDisabled();

    await user.click(within(pager).getByRole('button', { name: String(pageCount) }));
    const lastPage = filterAdminBilans(DEFAULT_QUERY).slice(PAGE_SIZE * (pageCount - 1));
    expect(rows().map((row) => within(row).getAllByRole('link')[0].textContent)).toEqual(
      lastPage.map(rowLabel),
    );

    // Changing the sort sends the listing back to the first page.
    await user.click(screen.getByRole('button', { name: /Plus récents/ }));
    await user.click(
      within(screen.getByRole('listbox', { name: 'Tri' })).getByRole('button', {
        name: 'Plus anciens',
      }),
    );
    expect(
      within(screen.getByRole('navigation', { name: 'Pagination' })).getByRole('button', {
        name: '1',
      }),
    ).toHaveAttribute('aria-current', 'page');
    expect(rows()[0]).toHaveTextContent('Mai 2025 — Le tout premier bilan');
  });
});
