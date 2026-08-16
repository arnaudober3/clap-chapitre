import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminArticleFormPage from '../pages/AdminArticleForm';
import AdminArticlesPage from '../pages/AdminArticles';
import { anArticle, SEED } from './fixtures';
import { useTestDb } from './api-server';

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

const avis = anArticle();

/** Both the listing and the editor fetch, so every test needs the catalogue. */
beforeEach(async () => {
  await useTestDb(SEED);
});

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

  it('refuses to save without a title or a category, and says which is missing', async () => {
    const user = userEvent.setup();
    renderAt('/admin/articles/nouveau');

    // Both columns are NOT NULL with no sensible default. Caught in the form so
    // the editor reads plain French rather than a 422 naming a wire field.
    await user.click(screen.getByRole('button', { name: 'Publier' }));
    expect(await screen.findByText('Il manque le titre.')).toBeInTheDocument();

    await user.type(screen.getByLabelText('Titre'), 'Une nuit blanche');
    await user.click(screen.getByRole('button', { name: 'Publier' }));
    expect(await screen.findByText('Choisissez une catégorie.')).toBeInTheDocument();
  });

  it('stores a draft and stays out of the public feed', async () => {
    const user = userEvent.setup();
    const db = await useTestDb(SEED);
    renderAt('/admin/articles/nouveau');

    await user.type(screen.getByLabelText('Titre'), 'Une nuit blanche');
    await user.type(screen.getByLabelText('Accroche'), 'Et si la nuit ne finissait pas ?');
    await user.click(screen.getByRole('button', { name: 'Film' }));
    await user.click(screen.getByRole('button', { name: 'Enregistrer le brouillon' }));

    // Creating lands on the avis' own editor: the form must stop thinking it is
    // creating, or the next save would write a second avis.
    expect(await screen.findByText('Une nuit blanche')).toBeInTheDocument();
    expect(screen.queryByText('Nouvel article')).toBeNull();

    const row = await db
      .prepare("SELECT id, title, medium, status, published_at FROM articles WHERE title = 'Une nuit blanche'")
      .first();
    expect(row).toEqual({
      // Derived from the title server-side, which is why the form never asks.
      id: 'une-nuit-blanche',
      title: 'Une nuit blanche',
      medium: 'film',
      status: 'draft',
      published_at: null,
    });
  });

  it('publishes what it stores, dating it', async () => {
    const user = userEvent.setup();
    const db = await useTestDb(SEED);
    renderAt('/admin/articles/nouveau');

    await user.type(screen.getByLabelText('Titre'), 'Une nuit blanche');
    await user.click(screen.getByRole('button', { name: 'Film' }));
    await user.click(screen.getByRole('button', { name: 'Publier' }));
    await screen.findByText('Une nuit blanche');

    const row = await db
      .prepare("SELECT status, published_at FROM articles WHERE id = 'une-nuit-blanche'")
      .first<{ status: string; published_at: string | null }>();
    expect(row?.status).toBe('published');
    // The schema pairs the two: published ⇔ dated.
    expect(row?.published_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);

    // And exactly one avis, not one per click.
    const count = await db
      .prepare("SELECT count(*) AS total FROM articles WHERE title = 'Une nuit blanche'")
      .first<{ total: number }>();
    expect(count?.total).toBe(1);
  });
});

describe('AA-4 article form — editing', () => {
  it('prefills every field from the shared Article model', async () => {
    renderAt(`/admin/articles/${avis.id}`);
    await screen.findByTestId('admin-new-article-page');
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

  it('splits genreMeta across the three metadata rows', async () => {
    renderAt(`/admin/articles/${avis.id}`);
    await screen.findByTestId('admin-new-article-page');
    const [genre, duration, year] = avis.genreMeta!.split(' · ');
    expect(screen.getByDisplayValue(genre)).toBeInTheDocument();
    expect(screen.getByDisplayValue(duration)).toBeInTheDocument();
    expect(screen.getByDisplayValue(year)).toBeInTheDocument();
  });

  it('saves an edit to the row it was opened on', async () => {
    const user = userEvent.setup();
    const db = await useTestDb(SEED);
    renderAt(`/admin/articles/${avis.id}`);
    await screen.findByTestId('admin-new-article-page');

    const title = screen.getByLabelText('Titre');
    await user.clear(title);
    await user.type(title, 'Un dernier été, revu');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    expect(await screen.findByText('Enregistré')).toBeInTheDocument();
    const row = await db
      .prepare('SELECT title FROM articles WHERE id = ?')
      .bind(avis.id)
      .first();
    expect(row?.title).toBe('Un dernier été, revu');
  });

  it('offers Dépublier on a live avis, and unpublishing clears its date', async () => {
    const user = userEvent.setup();
    const db = await useTestDb(SEED);
    renderAt(`/admin/articles/${avis.id}`);
    await screen.findByTestId('admin-new-article-page');

    // A published avis has nothing left to publish — the primary action is the
    // way back out. Nothing distinguished the two before this.
    expect(screen.queryByRole('button', { name: 'Publier' })).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Dépublier' }));

    expect(await screen.findByText('Enregistré')).toBeInTheDocument();
    const row = await db
      .prepare('SELECT status, published_at FROM articles WHERE id = ?')
      .bind(avis.id)
      .first();
    expect(row).toEqual({ status: 'draft', published_at: null });
  });

  it('asks before deleting, then removes the avis and returns to the listing', async () => {
    const user = userEvent.setup();
    const db = await useTestDb(SEED);
    renderAt(`/admin/articles/${avis.id}`);
    await screen.findByTestId('admin-new-article-page');

    // Two steps: the button sits beside "Enregistrer", so one stray click must
    // not be enough.
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    expect(screen.getByText('Supprimer cet avis ?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Confirmer la suppression' }));

    await screen.findByTestId('admin-articles-page');
    const row = await db.prepare('SELECT id FROM articles WHERE id = ?').bind(avis.id).first();
    expect(row).toBeNull();
  });

  it('backs out of the confirmation without deleting anything', async () => {
    const user = userEvent.setup();
    const db = await useTestDb(SEED);
    renderAt(`/admin/articles/${avis.id}`);
    await screen.findByTestId('admin-new-article-page');

    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    await user.click(screen.getByRole('button', { name: 'Annuler' }));

    expect(screen.getByRole('button', { name: 'Supprimer' })).toBeInTheDocument();
    const row = await db.prepare('SELECT id FROM articles WHERE id = ?').bind(avis.id).first();
    expect(row).not.toBeNull();
  });

  it('sends an unknown id back to the listing', async () => {
    renderAt('/admin/articles/nope');
    await screen.findByTestId('admin-articles-page');
    expect(screen.getByTestId('admin-articles-page')).toBeInTheDocument();
    expect(screen.queryByTestId('admin-new-article-page')).toBeNull();
  });
});
