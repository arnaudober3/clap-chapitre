import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminArticlesPage from '../pages/AdminArticles';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';

/**
 * The listing pages seven rows at a time, so the catalogue has to be bigger than
 * a page for any of this to mean anything. The seed's three avis are topped up
 * with eleven filler ones — enough for two full pages and a short third.
 */
const PAGE_SIZE = 7;
const FILLER = Array.from({ length: 11 }, (_, index) => {
  const day = String(index + 1).padStart(2, '0');
  return `('avis-${index}','Avis numéro ${index}','film','Résumé.','grad','Marie-Zoé','published','2026-06-${day}',${index},${index * 10})`;
}).join(',\n');

const CATALOGUE = `${SEED}
INSERT INTO articles (id,title,medium,excerpt,cover,author,status,published_at,likes,views)
VALUES
${FILLER};
`;

/** Two published avis in the seed, eleven fillers, one draft. */
const TOTAL = 14;
const DRAFTS = 1;

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminArticlesPage />
    </MemoryRouter>,
  );
}

function rows() {
  return screen.getAllByTestId('admin-article-row');
}

/** The rows of the current page, once the request has settled. */
async function loadedRows() {
  await screen.findAllByTestId('admin-article-row');
  return rows();
}

describe('AA-3 AdminArticlesPage', () => {
  beforeEach(() => {
    useTestDb(CATALOGUE);
  });

  it('heads the page with the catalogue totals and the primary action', async () => {
    renderPage();
    expect(screen.getByTestId('admin-articles-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Articles');
    // The totals describe the whole shelf, not the current page.
    expect(await screen.findByText(`${TOTAL} avis · ${DRAFTS} brouillon`)).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: 'Nouvel article' })) {
      expect(link).toHaveAttribute('href', '/admin/articles/nouveau');
    }
  });

  it('renders one page of rows, drafts first, each linking to its editor', async () => {
    renderPage();
    expect(await loadedRows()).toHaveLength(PAGE_SIZE);

    // Whatever the sort, what is being written comes before what is online.
    const first = rows()[0];
    expect(within(first).getByText('Contre-champs')).toBeInTheDocument();
    expect(within(first).getByRole('link', { name: 'Contre-champs' })).toHaveAttribute(
      'href',
      '/admin/articles/contre-champs',
    );
  });

  it('shows a draft with its "Modifié…" line, a Brouillon pill and no figures', async () => {
    renderPage();
    await loadedRows();
    const row = rows().find((node) => within(node).queryByText('Contre-champs'))!;

    expect(within(row).getByText('Brouillon')).toBeInTheDocument();
    expect(within(row).getByText(/^Modifié/)).toBeInTheDocument();
    // No publication date: the column shows an em dash rather than a blank.
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('gives every row a single target: the editor', async () => {
    renderPage();
    await loadedRows();
    for (const row of rows()) {
      const links = within(row).getAllByRole('link');
      expect(links).toHaveLength(1);
      expect(links[0].getAttribute('href')).toMatch(/^\/admin\/articles\//);
    }
    const published = rows().find((node) => within(node).queryByText('Un dernier été'))!;
    expect(within(published).getByText('Publié')).toBeInTheDocument();
  });

  it('filters on status, and the count follows', async () => {
    const user = userEvent.setup();
    renderPage();
    await loadedRows();

    await user.click(screen.getByRole('button', { name: /Brouillons/ }));
    await screen.findByText(`${DRAFTS} article sur ${DRAFTS}`);
    expect(rows()).toHaveLength(DRAFTS);
  });

  it('searches by title, accents aside, and falls back to an empty state', async () => {
    const user = userEvent.setup();
    renderPage();
    await loadedRows();
    const search = screen.getByLabelText('Rechercher un titre');

    // Unaccented input finds the accented title: the column and the term are
    // folded the same way, in SQL.
    await user.type(search, 'ete');
    expect(await screen.findByText('Un dernier été')).toBeInTheDocument();
    expect(rows().length).toBeLessThan(PAGE_SIZE);

    await user.clear(search);
    await user.type(search, 'zzz');
    expect(
      await screen.findByText('Aucun article ne correspond à cette recherche.'),
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId('admin-article-row')).toHaveLength(0);
  });

  it('pages through the catalogue and resets to page 1 when a filter changes', async () => {
    const user = userEvent.setup();
    renderPage();
    await loadedRows();
    const pageCount = Math.ceil(TOTAL / PAGE_SIZE);

    expect(await screen.findByText(`${PAGE_SIZE} articles sur ${TOTAL}`)).toBeInTheDocument();
    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pager).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(pager).getByRole('button', { name: 'Page précédente' })).toBeDisabled();

    const firstTitles = rows().map((row) => within(row).getAllByRole('link')[0].textContent);
    await user.click(within(pager).getByRole('button', { name: '2' }));
    await screen.findByText(/articles sur/);
    const secondTitles = rows().map((row) => within(row).getAllByRole('link')[0].textContent);
    // A second page, not the first one again — the offset really moved.
    expect(secondTitles).not.toEqual(firstTitles);

    await user.click(
      within(screen.getByRole('navigation', { name: 'Pagination' })).getByRole('button', {
        name: String(pageCount),
      }),
    );
    await screen.findAllByTestId('admin-article-row');
    expect(rows()).toHaveLength(TOTAL - PAGE_SIZE * (pageCount - 1));

    // Changing a filter sends the listing back to the first page.
    await user.click(screen.getByRole('button', { name: 'Publiés' }));
    await screen.findAllByTestId('admin-article-row');
    expect(
      within(screen.getByRole('navigation', { name: 'Pagination' })).getByRole('button', {
        name: '1',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });
});
