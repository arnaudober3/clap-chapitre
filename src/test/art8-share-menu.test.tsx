import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ArticlePage from '../pages/Article';
import { anArticle, SEED } from './fixtures';
import { useTestDb } from './api-server';
import { SHARE_CHANNELS } from '../share';

const root = resolve(__dirname, '../..');
const shareDir = resolve(root, 'src/components/ui/ShareMenu');
const shareSources = readdirSync(shareDir).map((file) =>
  readFileSync(resolve(shareDir, file), 'utf8'),
);

const avis = anArticle();
const shareUrl = `${window.location.origin}/article/${avis.id}`;

// The page fetches, so every test starts from a database holding the same avis
// the fixture describes.
beforeEach(() => {
  useTestDb(SEED);
});

function renderArticle() {
  return render(
    <MemoryRouter initialEntries={[`/article/${avis.id}`]}>
      <Routes>
        <Route path="/article/:id" element={<ArticlePage />} />
      </Routes>
    </MemoryRouter>,
  );
}

/** Open the article's share menu and hand back its <ul role="menu">. */
async function openMenu(user: ReturnType<typeof userEvent.setup>) {
  await user.click(await screen.findByRole('button', { name: 'Partager' }));
  return screen.getByRole('menu', { name: 'Partager' });
}

describe('ART-8 ShareMenu', () => {
  it('stays closed until "Partager" is clicked', async () => {
    renderArticle();
    const trigger = await screen.findByRole('button', { name: 'Partager' });
    expect(trigger).toHaveAttribute('aria-haspopup', 'menu');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('opens on click and lists "Copier le lien" plus one menuitem per channel', async () => {
    const user = userEvent.setup();
    renderArticle();
    const menu = await openMenu(user);

    expect(
      screen.getByRole('button', { name: 'Partager' }),
    ).toHaveAttribute('aria-expanded', 'true');
    expect(within(menu).getAllByRole('menuitem')).toHaveLength(
      SHARE_CHANNELS.length + 1,
    );
    for (const entry of SHARE_CHANNELS) {
      expect(
        within(menu).getByRole('menuitem', { name: entry.label }),
      ).toBeInTheDocument();
    }
    // The copy entry leads: it is the one a content blocker cannot hide.
    expect(within(menu).getAllByRole('menuitem')[0]).toHaveTextContent(
      'Copier le lien',
    );
  });

  it('copies the avis URL to the clipboard and confirms it', async () => {
    const user = userEvent.setup();
    renderArticle();
    const menu = await openMenu(user);

    await user.click(within(menu).getByRole('menuitem', { name: 'Copier le lien' }));
    expect(await navigator.clipboard.readText()).toBe(shareUrl);
    expect(
      await screen.findByRole('menuitem', { name: 'Lien copié' }),
    ).toBeInTheDocument();
  });

  it('leaves the label alone when the clipboard write is refused', async () => {
    const user = userEvent.setup();
    const denied = vi
      .spyOn(navigator.clipboard, 'writeText')
      .mockRejectedValue(new Error('denied'));
    renderArticle();
    const menu = await openMenu(user);

    await user.click(within(menu).getByRole('menuitem', { name: 'Copier le lien' }));
    expect(denied).toHaveBeenCalled();
    // No false confirmation, and the other entries stay reachable.
    expect(screen.queryByRole('menuitem', { name: 'Lien copié' })).toBeNull();
    expect(
      screen.getByRole('menuitem', { name: 'Copier le lien' }),
    ).toBeInTheDocument();
    denied.mockRestore();
  });

  it('points every entry at its intent URL, carrying the avis URL and title', async () => {
    const user = userEvent.setup();
    renderArticle();
    const menu = await openMenu(user);

    for (const entry of SHARE_CHANNELS) {
      const link = within(menu).getByRole('menuitem', { name: entry.label });
      expect(link).toHaveAttribute(
        'href',
        entry.href({ url: shareUrl, title: avis.title, excerpt: avis.excerpt }),
      );
      expect(link.getAttribute('href')).toContain(encodeURIComponent(shareUrl));
      if (entry.external) {
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      } else {
        expect(link).not.toHaveAttribute('target');
      }
    }
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    renderArticle();
    await openMenu(user);

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).toBeNull();
    expect(screen.getByRole('button', { name: 'Partager' })).toHaveFocus();
  });

  it('closes on an outside click and on picking an entry', async () => {
    const user = userEvent.setup();
    renderArticle();
    await openMenu(user);

    await user.click(screen.getByRole('heading', { level: 1 }));
    expect(screen.queryByRole('menu')).toBeNull();

    const menu = await openMenu(user);
    await user.click(within(menu).getByRole('menuitem', { name: 'Facebook' }));
    expect(screen.queryByRole('menu')).toBeNull();
  });
});

describe('ART-8 tokens', () => {
  it('uses no raw Salon hex colour literal, no <img> and no url()', () => {
    for (const source of shareSources) {
      expect(source).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source).not.toContain('<img');
      expect(source).not.toContain('url(');
    }
  });
});
