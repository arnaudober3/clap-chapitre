import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import type { Medium, PublishedArticle } from '../../shared/content';
import AdminBilanFormPage from '../pages/AdminBilanForm';
import { useTestDb } from './api-server';

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

/** A catalogue large enough to make the "Voir plus" batching observable. */
const CATALOGUE: PublishedArticle[] = Array.from({ length: 8 }, (_, i) =>
  avis(`cat-${i}`, `Catalogue ${i}`, 'film', `2026-06-${String(20 - i).padStart(2, '0')}`),
);
const JULY = avis('jul-1', 'Un avis de juillet', 'livre', '2026-07-15');

/** The month the editor opens on — a draft with no coup de cœur yet. */
const SEED_SQL = `
INSERT INTO articles (id,title,medium,excerpt,cover,author,status,published_at,likes,views,hook,body,for_those_who,related_to_title,related_to_note)
VALUES
${[JULY, ...CATALOGUE]
  .map(
    (item) =>
      `('${item.id}','${item.title}','${item.medium}','${item.excerpt}','${item.cover}','Marie-Zoé','published','${item.publishedAt}',0,0,'${item.hook}','${item.body}','${item.forThoseWho}','${item.relatedTo!.title}','${item.relatedTo!.note}')`,
  )
  .join(',\n')};

INSERT INTO bilans (id,year,month,month_label,title,mood,status,updated_at,views,likes)
VALUES ('2026-07',2026,7,'Juillet','Un mois','','draft','2026-07-20T09:00:00Z',0,0);
`;

async function renderEditor() {
  useTestDb(SEED_SQL);
  const result = render(
    <MemoryRouter initialEntries={['/admin/bilans/2026-07']}>
      <Routes>
        <Route path="/admin/bilans/:id" element={<AdminBilanFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByTestId('admin-bilan-form-page');
  return result;
}

function panel() {
  return within(screen.getByRole('listbox', { name: /mettre en avant/ }));
}

describe('AB-7 adding a coup de cœur from the editor', () => {
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
