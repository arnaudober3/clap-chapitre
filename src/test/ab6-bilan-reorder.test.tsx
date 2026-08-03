import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { moveByOne, moveTo } from '../reorder';
import type { Highlight } from '../pages/AdminBilanForm/HighlightCard';
import type { Medium } from '../../shared/content';
import AdminBilanFormPage from '../pages/AdminBilanForm';
import { useTestDb } from './api-server';

/** A minimal coup de cœur — only `id` and `medium` drive the reordering. */
function item(id: string, medium: Medium): Highlight {
  return {
    id,
    medium,
    title: id,
    hook: '',
    body: '',
    relatedTitle: '',
    relatedNote: '',
    forThoseWho: '',
  };
}

const ids = (list: Highlight[]) => list.map((entry) => entry.id);

describe('AB-6 reorder rules', () => {
  const list = [item('f1', 'film'), item('l1', 'livre'), item('f2', 'film'), item('f3', 'film')];

  it('moves a coup de cœur to any position, up or down', () => {
    expect(ids(moveTo(list, 'f3', 'f1'))).toEqual(['f3', 'f1', 'l1', 'f2']);
    expect(ids(moveTo(list, 'f1', 'f3'))).toEqual(['l1', 'f2', 'f3', 'f1']);
  });

  it('mixes the media freely — the order is editorial, not structural', () => {
    // livre, film, film, film → film, livre, film, film and back.
    expect(ids(moveTo(list, 'l1', 'f1'))).toEqual(['l1', 'f1', 'f2', 'f3']);
    expect(ids(moveTo(list, 'l1', 'f3'))).toEqual(['f1', 'f2', 'f3', 'l1']);
    // A film can land between two livres just as well.
    const mixed = [item('l1', 'livre'), item('l2', 'livre'), item('f1', 'film')];
    expect(ids(moveTo(mixed, 'f1', 'l2'))).toEqual(['l1', 'f1', 'l2']);
  });

  it('returns the list untouched on a no-op', () => {
    // Same reference, not just an equal array: a no-op must not re-render.
    expect(moveTo(list, 'f1', 'f1')).toBe(list);
    expect(moveTo(list, 'nope', 'f1')).toBe(list);
    expect(moveTo(list, 'f1', 'nope')).toBe(list);
  });

  it('steps one place up or down, across media alike', () => {
    expect(ids(moveByOne(list, 'f2', -1))).toEqual(['f1', 'f2', 'l1', 'f3']);
    expect(ids(moveByOne(list, 'f2', 1))).toEqual(['f1', 'l1', 'f3', 'f2']);
    // The step is a plain neighbour swap, medium regardless.
    expect(ids(moveByOne(list, 'l1', 1))).toEqual(['f1', 'f2', 'l1', 'f3']);
  });

  it('stops at either end of the list, and ignores an unknown id', () => {
    expect(moveByOne(list, 'f1', -1)).toBe(list);
    expect(moveByOne(list, 'f3', 1)).toBe(list);
    expect(moveByOne(list, 'nope', 1)).toBe(list);
  });
});

/** A minimal avis — only what the editor reads off the model. */
/**
 * The draft the editor opens: a film and a livre, so a move is both observable
 * and proof that the order ignores the medium.
 */
const MIXED = `
INSERT INTO articles (id,title,medium,excerpt,cover,author,status,published_at,likes,views)
VALUES ('a','Le premier','film','Un excerpt.','grad','Marie-Zoé','published','2026-08-01',0,0),
       ('b','Le second','livre','Un excerpt.','grad','Marie-Zoé','published','2026-08-02',0,0);

INSERT INTO bilans (id,year,month,month_label,title,mood,status,updated_at,views,likes)
VALUES ('2026-08',2026,8,'Août','Un mois mêlé','','draft','2026-08-20T09:00:00Z',0,0);

INSERT INTO bilan_avis (bilan_id,article_id,position) VALUES ('2026-08','a',1),('2026-08','b',2);

INSERT INTO bilan_counts (bilan_id,medium,count) VALUES ('2026-08','film',1),('2026-08','livre',1);
`;

/** Renders the editor over that month, once its content has arrived. */
async function renderEditor() {
  useTestDb(MIXED);
  const result = render(
    <MemoryRouter initialEntries={['/admin/bilans/2026-08']}>
      <Routes>
        <Route path="/admin/bilans/:id" element={<AdminBilanFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByTestId('admin-bilan-form-page');
  return result;
}

/** The order the editor currently reads, top to bottom. */
function order() {
  return screen
    .getAllByLabelText('Titre de l’œuvre')
    .map((field) => (field as HTMLInputElement).value);
}

describe('AB-6 reordering from the editor', () => {
  it('labels each handle with its rank in the list', async () => {
    await renderEditor();
    expect(
      screen.getByRole('button', { name: 'Déplacer « Le premier » — 1 sur 2' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Déplacer « Le second » — 2 sur 2' }),
    ).toBeInTheDocument();
  });

  it('moves a card down and back up with the arrow keys, across media', async () => {
    const user = userEvent.setup();
    await renderEditor();
    expect(order()).toEqual(['Le premier', 'Le second']);

    // The film moves past the livre — nothing groups them.
    within(screen.getAllByTestId('highlight-card')[0]).getByRole('button').focus();
    await user.keyboard('{ArrowDown}');
    expect(order()).toEqual(['Le second', 'Le premier']);

    // The handle travelled with its card, so the focus is still on it.
    await user.keyboard('{ArrowUp}');
    expect(order()).toEqual(['Le premier', 'Le second']);
  });

  it('stops at the end of the list instead of wrapping', async () => {
    const user = userEvent.setup();
    await renderEditor();

    within(screen.getAllByTestId('highlight-card')[0]).getByRole('button').focus();
    await user.keyboard('{ArrowUp}');
    expect(order()).toEqual(['Le premier', 'Le second']);
  });

  it('carries the edits along when a card moves', async () => {
    const user = userEvent.setup();
    await renderEditor();

    const first = screen.getAllByLabelText('Titre de l’œuvre')[0];
    await user.clear(first);
    await user.type(first, 'Renommé');

    within(screen.getAllByTestId('highlight-card')[0]).getByRole('button').focus();
    await user.keyboard('{ArrowDown}');
    expect(order()).toEqual(['Le second', 'Renommé']);
  });
});
