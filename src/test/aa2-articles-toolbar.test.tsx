import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ArticlesToolbar from '../pages/AdminArticles/ArticlesToolbar';
import { DEFAULT_QUERY, type ArticleQuery } from '../mock/adminArticles';

function renderToolbar(query: Partial<ArticleQuery> = {}) {
  const onChange = vi.fn();
  render(
    <ArticlesToolbar
      query={{ ...DEFAULT_QUERY, ...query }}
      draftCount={2}
      onChange={onChange}
    />,
  );
  return { onChange };
}

describe('AA-2 ArticlesToolbar', () => {
  it('marks the active status segment and reports the picked one', async () => {
    const user = userEvent.setup();
    const { onChange } = renderToolbar();

    const group = screen.getByRole('group', { name: 'Statut' });
    expect(within(group).getByRole('button', { name: 'Tous' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await user.click(within(group).getByRole('button', { name: /Brouillons/ }));
    expect(onChange).toHaveBeenCalledWith({ status: 'draft' });
  });

  it('shows the draft backlog next to the Brouillons segment', () => {
    renderToolbar();
    expect(screen.getByRole('button', { name: 'Brouillons 2' })).toBeInTheDocument();
  });

  it('opens the medium dropdown and reports the selected medium', async () => {
    const user = userEvent.setup();
    const { onChange } = renderToolbar();

    await user.click(screen.getByRole('button', { name: /Tous les médiums/ }));
    const listbox = screen.getByRole('listbox', { name: 'Médium' });
    await user.click(within(listbox).getByRole('button', { name: 'Séries' }));

    expect(onChange).toHaveBeenCalledWith({ medium: 'serie' });
    expect(screen.queryByRole('listbox')).toBeNull();
  });

  it('closes an open dropdown on Escape without selecting anything', async () => {
    const user = userEvent.setup();
    const { onChange } = renderToolbar();

    await user.click(screen.getByRole('button', { name: /Plus récents/ }));
    expect(screen.getByRole('listbox', { name: 'Tri' })).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('reports each keystroke of the title search', async () => {
    const user = userEvent.setup();
    const { onChange } = renderToolbar();

    await user.type(screen.getByLabelText('Rechercher un titre'), 'ete');
    expect(onChange).toHaveBeenCalledWith({ search: 'e' });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('reflects the query it is given', () => {
    renderToolbar({ status: 'published', medium: 'livre', sort: 'views', search: 'pluie' });
    expect(screen.getByRole('button', { name: 'Publiés' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: /Livres/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Plus vus/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Rechercher un titre')).toHaveValue('pluie');
  });
});
