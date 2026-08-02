import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BilanCulturelPage from '../pages/BilanCulturel';
import { bilans, latestBilan } from '../mock/bilans';
import { SHARE_CHANNELS } from '../share';

/** An older month, to prove the shared link follows `?mois=` and not the page. */
const older = bilans.find((b) => b.id !== latestBilan().id)!;

function renderBilan(path = '/bilan-culturel') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BilanCulturelPage />
    </MemoryRouter>,
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole('button', { name: 'Partager' }));
  return screen.getByRole('menu', { name: 'Partager' });
}

describe('BC-6 ShareMenu', () => {
  it('shares the latest bilan by its canonical ?mois= URL, not the bare path', async () => {
    const user = userEvent.setup();
    renderBilan();
    const menu = await openMenu(user);
    const active = latestBilan();
    const url = `${window.location.origin}/bilan-culturel?mois=${active.id}`;

    // The channels, plus the leading "Copier le lien" action.
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(
      SHARE_CHANNELS.length + 1,
    );
    for (const entry of SHARE_CHANNELS) {
      const link = within(menu).getByRole('menuitem', { name: entry.label });
      expect(link).toHaveAttribute(
        'href',
        entry.href({ url, title: active.title, excerpt: active.mood }),
      );
    }
  });

  it('shares the month named in the URL when one is given', async () => {
    const user = userEvent.setup();
    renderBilan(`/bilan-culturel?mois=${older.id}`);
    const menu = await openMenu(user);

    const link = within(menu).getByRole('menuitem', { name: 'Facebook' });
    expect(link.getAttribute('href')).toContain(
      encodeURIComponent(`/bilan-culturel?mois=${older.id}`),
    );
    expect(link.getAttribute('href')).not.toContain(
      encodeURIComponent(`mois=${latestBilan().id}`),
    );
  });

  it('closes on Escape', async () => {
    const user = userEvent.setup();
    renderBilan();
    await openMenu(user);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
