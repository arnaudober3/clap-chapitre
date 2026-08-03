import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import BilanCulturelPage from '../pages/BilanCulturel';
import { aBilan, SEED } from './fixtures';
import { useTestDb } from './api-server';
import { SHARE_CHANNELS } from '../share';

/** An older month, to prove the shared link follows `?mois=` and not the page. */
const OLDER = `
INSERT INTO bilans (id,year,month,month_label,title,mood,status,published_at,views,likes)
VALUES ('2026-05',2026,5,'Mai','Le mois des seuils','Un mois en demi-teinte.','published','2026-06-02',900,20);
`;

const latestBilan = () => aBilan();
const older = { id: '2026-05', title: 'Le mois des seuils', mood: 'Un mois en demi-teinte.' };

beforeEach(() => {
  useTestDb(SEED + OLDER);
});

function renderBilan(path = '/bilan-culturel') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <BilanCulturelPage />
    </MemoryRouter>,
  );
}

async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Partager' }));
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
