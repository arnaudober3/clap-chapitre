import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { DraftBilan, Medium, PublishedArticle } from '../mock/types';

/** A minimal published avis — only the fields the picker and toHighlight read. */
function avis(id: string, title: string, medium: Medium, publishedAt: string): PublishedArticle {
  return {
    id,
    title,
    medium,
    excerpt: `${title} en une ligne.`,
    cover: 'linear-gradient(150deg,#000,#111)',
    date: publishedAt,
    author: 'Marie-Zoé',
    likes: 0,
    comments: 0,
    views: 0,
    status: 'published',
    publishedAt,
    hook: `Et si ${title} ?`,
    body: `Le corps de ${title}.`,
    relatedTo: { title: `Proche de ${title}`, note: 'ce qui les rapproche.' },
    forThoseWho: `Pour ceux qui aiment ${title}.`,
  };
}

describe('AB-7 avisForBilanPicker', () => {
  afterEach(() => {
    vi.doUnmock('../mock/adminArticles');
    vi.resetModules();
  });

  async function pickerWith(catalogue: PublishedArticle[]) {
    vi.resetModules();
    vi.doMock('../mock/adminArticles', () => ({ adminArticles: () => catalogue }));
    const { avisForBilanPicker } = await import('../mock/adminBilans');
    return avisForBilanPicker;
  }

  it('splits the bilan month from the rest, newest-first, published only', async () => {
    const pick = await pickerWith([
      avis('m-old', 'Juillet ancien', 'film', '2026-07-03'),
      avis('m-new', 'Juillet récent', 'livre', '2026-07-20'),
      avis('c-jun', 'Juin', 'serie', '2026-06-10'),
      avis('c-may', 'Mai', 'doc', '2026-05-02'),
      { ...avis('d1', 'Brouillon', 'film', ''), status: 'draft' } as unknown as PublishedArticle,
    ]);
    const { thisMonth, catalogue } = pick('2026-07', []);

    // The month's avis, most recent first.
    expect(thisMonth.map((a) => a.id)).toEqual(['m-new', 'm-old']);
    // Everything else, most recent first — and no draft anywhere.
    expect(catalogue.map((a) => a.id)).toEqual(['c-jun', 'c-may']);
    expect([...thisMonth, ...catalogue].some((a) => a.status !== 'published')).toBe(false);
  });

  it('drops the avis already in the bilan', async () => {
    const pick = await pickerWith([
      avis('a', 'A', 'film', '2026-06-10'),
      avis('b', 'B', 'livre', '2026-06-05'),
    ]);
    const { catalogue } = pick('2026-07', ['a']);
    expect(catalogue.map((x) => x.id)).toEqual(['b']);
  });

  it('leaves the month section empty when no avis matches it', async () => {
    const pick = await pickerWith([avis('c', 'C', 'film', '2026-06-10')]);
    const { thisMonth, catalogue } = pick('2026-07', []);
    expect(thisMonth).toEqual([]);
    expect(catalogue.map((x) => x.id)).toEqual(['c']);
  });
});

/** A catalogue large enough to make the "Voir plus" batching observable. */
const CATALOGUE: PublishedArticle[] = Array.from({ length: 8 }, (_, i) =>
  avis(`cat-${i}`, `Catalogue ${i}`, 'film', `2026-06-${String(20 - i).padStart(2, '0')}`),
);
const JULY = avis('jul-1', 'Un avis de juillet', 'livre', '2026-07-15');

/** The draft the editor opens on — its own avis start empty. */
const DRAFT: DraftBilan = {
  id: '2026-07',
  year: 2026,
  month: 7,
  monthLabel: 'Juillet',
  title: 'Un mois',
  mood: '',
  counts: {},
  views: 0,
  likes: 0,
  status: 'draft',
  updatedLabel: 'modifié à l’instant',
  avis: [],
};

async function renderEditor() {
  vi.resetModules();
  vi.doMock('../mock/adminArticles', () => ({ adminArticles: () => [JULY, ...CATALOGUE] }));
  vi.doMock('../mock/adminBilans', async () => {
    const actual = await vi.importActual<typeof import('../mock/adminBilans')>('../mock/adminBilans');
    return { ...actual, adminBilanById: () => DRAFT };
  });
  const { default: Page } = await import('../pages/AdminBilanForm');
  return render(
    <MemoryRouter initialEntries={['/admin/bilans/2026-07']}>
      <Routes>
        <Route path="/admin/bilans/:id" element={<Page />} />
      </Routes>
    </MemoryRouter>,
  );
}

function panel() {
  return within(screen.getByRole('listbox', { name: /mettre en avant/ }));
}

describe('AB-7 adding a coup de cœur from the editor', () => {
  afterEach(() => {
    vi.doUnmock('../mock/adminArticles');
    vi.doUnmock('../mock/adminBilans');
    vi.resetModules();
  });

  it('opens the picker, month avis over the catalogue', async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole('button', { name: 'Ajouter un coup de cœur' }));

    expect(panel().getByText('Avis de juillet')).toBeInTheDocument();
    expect(panel().getByText('Tout le catalogue')).toBeInTheDocument();
    expect(panel().getByRole('option', { name: 'Ajouter « Un avis de juillet »' })).toBeInTheDocument();
  });

  it('reveals the catalogue a batch at a time', async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole('button', { name: 'Ajouter un coup de cœur' }));

    // BATCH is 6: the 8-strong catalogue shows 6, then all after "Voir plus".
    expect(panel().getAllByRole('option', { name: /Catalogue/ })).toHaveLength(6);
    await user.click(panel().getByRole('button', { name: 'Voir plus' }));
    expect(panel().getAllByRole('option', { name: /Catalogue/ })).toHaveLength(8);
    expect(panel().queryByRole('button', { name: 'Voir plus' })).toBeNull();
  });

  it('filters the list by title, accent-insensitive, and resets on reopen', async () => {
    const user = userEvent.setup();
    await renderEditor();
    await user.click(screen.getByRole('button', { name: 'Ajouter un coup de cœur' }));

    // "juillet" narrows to the month avis, dropping every catalogue row.
    await user.type(panel().getByRole('searchbox', { name: 'Rechercher un avis' }), 'juillet');
    expect(panel().getByRole('option', { name: 'Ajouter « Un avis de juillet »' })).toBeInTheDocument();
    expect(panel().queryAllByRole('option', { name: /Catalogue/ })).toHaveLength(0);

    // A miss shows the empty message, not the sections.
    await user.clear(panel().getByRole('searchbox', { name: 'Rechercher un avis' }));
    await user.type(panel().getByRole('searchbox', { name: 'Rechercher un avis' }), 'zzz');
    expect(panel().getByText('Aucun avis ne correspond.')).toBeInTheDocument();

    // Reopening clears the query — the whole list is back.
    await user.keyboard('{Escape}');
    await user.click(screen.getByRole('button', { name: 'Ajouter un coup de cœur' }));
    expect(panel().getByRole('searchbox', { name: 'Rechercher un avis' })).toHaveValue('');
    expect(panel().getAllByRole('option', { name: /Catalogue/ })).toHaveLength(6);
  });

  it('adds a pre-filled, editable card and drops the avis from the picker', async () => {
    const user = userEvent.setup();
    const { container } = await renderEditor();
    const cards = () => container.querySelectorAll('[data-testid="highlight-card"]');
    expect(cards()).toHaveLength(0);

    await user.click(screen.getByRole('button', { name: 'Ajouter un coup de cœur' }));
    await user.click(panel().getByRole('option', { name: 'Ajouter « Un avis de juillet »' }));

    // A card appeared, pre-filled from the avis, and the panel closed.
    expect(cards()).toHaveLength(1);
    expect(screen.getByDisplayValue('Un avis de juillet')).toBeInTheDocument();
    expect(screen.getByDisplayValue('Le corps de Un avis de juillet.')).toBeInTheDocument();
    expect(screen.queryByRole('listbox', { name: /mettre en avant/ })).toBeNull();

    // The field is editable, and reopening the picker no longer offers that avis.
    await user.clear(screen.getByLabelText('Titre de l’œuvre'));
    await user.type(screen.getByLabelText('Titre de l’œuvre'), 'Renommé');
    expect(screen.getByLabelText('Titre de l’œuvre')).toHaveValue('Renommé');

    await user.click(screen.getByRole('button', { name: 'Ajouter un coup de cœur' }));
    expect(
      panel().queryByRole('option', { name: 'Ajouter « Un avis de juillet »' }),
    ).toBeNull();
  });
});
