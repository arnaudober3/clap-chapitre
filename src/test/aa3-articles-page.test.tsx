import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AdminArticlesPage from '../pages/AdminArticles';
import {
  adminArticleCounts,
  filterAdminArticles,
  DEFAULT_QUERY,
  PAGE_SIZE,
} from '../mock/adminArticles';

function renderPage() {
  return render(
    <MemoryRouter>
      <AdminArticlesPage />
    </MemoryRouter>,
  );
}

const counts = adminArticleCounts();
const firstPage = filterAdminArticles(DEFAULT_QUERY).slice(0, PAGE_SIZE);

function rows() {
  return screen.getAllByTestId('admin-article-row');
}

describe('AA-3 AdminArticlesPage', () => {
  it('heads the page with the catalogue totals and the primary action', () => {
    renderPage();
    expect(screen.getByTestId('admin-articles-page')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Articles');
    expect(
      screen.getByText(`${counts.total} avis · ${counts.drafts} brouillons`),
    ).toBeInTheDocument();
    for (const link of screen.getAllByRole('link', { name: 'Nouvel article' })) {
      expect(link).toHaveAttribute('href', '/admin/articles/nouveau');
    }
  });

  it('renders one page of rows, drafts first, each linking to its editor', () => {
    renderPage();
    expect(rows()).toHaveLength(PAGE_SIZE);
    const titles = rows().map((row) => within(row).getAllByRole('link')[0].textContent);
    expect(titles).toEqual(firstPage.map((article) => article.title));

    const first = firstPage[0];
    expect(within(rows()[0]).getByRole('link', { name: first.title })).toHaveAttribute(
      'href',
      `/admin/articles/${first.id}`,
    );
  });

  it('shows a draft with its "Modifié…" line, a Brouillon pill and no figures', () => {
    renderPage();
    const draft = firstPage.find((article) => article.status === 'draft')!;
    const row = rows().find((node) => within(node).queryByText(draft.title))!;

    expect(within(row).getByText('Brouillon')).toBeInTheDocument();
    expect(within(row).getByText(draft.updatedLabel)).toBeInTheDocument();
    expect(within(row).getAllByText('—').length).toBeGreaterThan(0);
  });

  it('gives every row a single target: the editor', () => {
    renderPage();
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

    await user.click(screen.getByRole('button', { name: /Brouillons/ }));
    expect(rows()).toHaveLength(counts.drafts);
    expect(screen.getByText(`${counts.drafts} articles sur ${counts.drafts}`)).toBeInTheDocument();
  });

  it('searches by title and falls back to an empty state', async () => {
    const user = userEvent.setup();
    renderPage();
    const search = screen.getByLabelText('Rechercher un titre');

    await user.type(search, 'ete');
    expect(screen.getByText('Un dernier été')).toBeInTheDocument();
    expect(rows().length).toBeLessThan(PAGE_SIZE);

    await user.clear(search);
    await user.type(search, 'zzz');
    expect(screen.queryAllByTestId('admin-article-row')).toHaveLength(0);
    expect(
      screen.getByText('Aucun article ne correspond à cette recherche.'),
    ).toBeInTheDocument();
  });

  it('pages through the catalogue and resets to page 1 when a filter changes', async () => {
    const user = userEvent.setup();
    renderPage();
    const pageCount = Math.ceil(counts.total / PAGE_SIZE);

    expect(screen.getByText(`${PAGE_SIZE} articles sur ${counts.total}`)).toBeInTheDocument();
    const pager = screen.getByRole('navigation', { name: 'Pagination' });
    expect(within(pager).getByRole('button', { name: '1' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(pager).getByRole('button', { name: 'Page précédente' })).toBeDisabled();

    await user.click(within(pager).getByRole('button', { name: '2' }));
    const secondPage = filterAdminArticles(DEFAULT_QUERY).slice(PAGE_SIZE, PAGE_SIZE * 2);
    expect(rows().map((row) => within(row).getAllByRole('link')[0].textContent)).toEqual(
      secondPage.map((article) => article.title),
    );

    // Last page holds the remainder, and "next" is spent.
    await user.click(
      within(screen.getByRole('navigation', { name: 'Pagination' })).getByRole('button', {
        name: String(pageCount),
      }),
    );
    expect(rows()).toHaveLength(counts.total - PAGE_SIZE * (pageCount - 1));

    // Changing a filter sends the listing back to the first page.
    await user.click(screen.getByRole('button', { name: 'Publiés' }));
    expect(
      within(screen.getByRole('navigation', { name: 'Pagination' })).getByRole('button', {
        name: '1',
      }),
    ).toHaveAttribute('aria-current', 'page');
  });
});
