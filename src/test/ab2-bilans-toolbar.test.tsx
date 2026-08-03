import { describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BilansToolbar from '../pages/AdminBilans/BilansToolbar';
import { DEFAULT_BILAN_QUERY as DEFAULT_QUERY, type BilanQuery } from '../content/query';

function renderToolbar(query: Partial<BilanQuery> = {}) {
  const onChange = vi.fn();
  render(<BilansToolbar query={{ ...DEFAULT_QUERY, ...query }} onChange={onChange} />);
  return { onChange };
}

describe('AB-2 BilansToolbar', () => {
  it('reports each keystroke of the title search', async () => {
    const user = userEvent.setup();
    const { onChange } = renderToolbar();

    await user.type(screen.getByLabelText('Rechercher un bilan'), 'mai');
    expect(onChange).toHaveBeenCalledWith({ search: 'm' });
    expect(onChange).toHaveBeenCalledTimes(3);
  });

  it('opens the sort dropdown and reports the picked order', async () => {
    const user = userEvent.setup();
    const { onChange } = renderToolbar();

    await user.click(screen.getByRole('button', { name: /Plus récents/ }));
    const listbox = screen.getByRole('listbox', { name: 'Tri' });
    await user.click(within(listbox).getByRole('button', { name: 'Plus vus' }));

    expect(onChange).toHaveBeenCalledWith({ sort: 'views' });
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

  it('reflects the query it is given', () => {
    renderToolbar({ sort: 'oldest', search: 'décembre' });
    expect(screen.getByRole('button', { name: /Plus anciens/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Rechercher un bilan')).toHaveValue('décembre');
  });
});
