import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminArticleFormPage from '../pages/AdminArticleForm';
import AdminArticlesPage from '../pages/AdminArticles';
import { adminArticleById } from '../mock/adminArticles';

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/articles" element={<AdminArticlesPage />} />
        <Route path="/admin/articles/nouveau" element={<AdminArticleFormPage />} />
        <Route path="/admin/articles/:id" element={<AdminArticleFormPage />} />
        <Route path="/admin" element={<div data-testid="admin-dashboard-page" />} />
      </Routes>
    </MemoryRouter>,
  );
}

const avis = adminArticleById('un-dernier-ete')!;

describe('AA-4 article form — creation', () => {
  it('opens an empty form with no category picked', () => {
    renderAt('/admin/articles/nouveau');
    const page = screen.getByTestId('admin-new-article-page');

    expect(within(page).getByLabelText('Titre')).toHaveValue('');
    expect(within(page).getByLabelText('Accroche')).toHaveValue('');
    expect(within(page).getByLabelText('Corps de l’avis')).toHaveValue('');
    expect(within(page).getByLabelText('Pour ceux qui…')).toHaveValue('');
    for (const label of ['Film', 'Série', 'Livre', 'Docs']) {
      expect(within(page).getByRole('button', { name: label })).toHaveAttribute(
        'aria-pressed',
        'false',
      );
    }
    expect(within(page).getByText('Nouvel article')).toBeInTheDocument();
  });

  it('picks a category and types into the fields', async () => {
    const user = userEvent.setup();
    renderAt('/admin/articles/nouveau');

    await user.click(screen.getByRole('button', { name: 'Film' }));
    expect(screen.getByRole('button', { name: 'Film' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Série' })).toHaveAttribute('aria-pressed', 'false');

    await user.type(screen.getByLabelText('Titre'), 'Un été de plus');
    expect(screen.getByLabelText('Titre')).toHaveValue('Un été de plus');
  });

  it('publishes back to the dashboard (mock — nothing is stored)', async () => {
    const user = userEvent.setup();
    renderAt('/admin/articles/nouveau');

    await user.click(screen.getByRole('button', { name: 'Publier' }));
    expect(screen.getByTestId('admin-dashboard-page')).toBeInTheDocument();
  });
});

describe('AA-4 article form — editing', () => {
  it('prefills every field from the shared Article model', () => {
    renderAt(`/admin/articles/${avis.id}`);
    const page = screen.getByTestId('admin-new-article-page');

    expect(within(page).getByLabelText('Titre')).toHaveValue(avis.title);
    expect(within(page).getByLabelText('Accroche')).toHaveValue(avis.hook);
    expect(within(page).getByLabelText('Corps de l’avis')).toHaveValue(avis.body);
    expect(within(page).getByLabelText('Pour ceux qui…')).toHaveValue(avis.forThoseWho);
    expect(within(page).getByRole('button', { name: 'Film' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // The breadcrumb names the avis and links back to the listing.
    expect(within(page).getByRole('link', { name: 'Articles' })).toHaveAttribute(
      'href',
      '/admin/articles',
    );
    expect(within(page).getByText(avis.title)).toBeInTheDocument();
  });

  it('splits genreMeta across the three metadata rows', () => {
    renderAt(`/admin/articles/${avis.id}`);
    const [genre, duration, year] = avis.genreMeta!.split(' · ');
    expect(screen.getByDisplayValue(genre)).toBeInTheDocument();
    expect(screen.getByDisplayValue(duration)).toBeInTheDocument();
    expect(screen.getByDisplayValue(year)).toBeInTheDocument();
  });

  it('saves back to the listing (mock — the row is unchanged)', async () => {
    const user = userEvent.setup();
    renderAt(`/admin/articles/${avis.id}`);

    expect(screen.queryByRole('button', { name: 'Publier' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(screen.getByTestId('admin-articles-page')).toBeInTheDocument();
  });

  it('sends an unknown id back to the listing', () => {
    renderAt('/admin/articles/nope');
    expect(screen.getByTestId('admin-articles-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-new-article-page')).toBeNull();
  });
});
