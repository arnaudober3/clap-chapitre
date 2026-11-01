/**
 * The "Annonce" block of the avis editor: a ticked box mails the subscribers
 * once the avis is saved published — never on a draft, never twice.
 */
import { beforeEach, describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import AdminArticleFormPage from '../pages/AdminArticleForm';
import { SEED } from './fixtures';
import { useTestDb } from './api-server';
import type { D1Database } from '../../functions/types';

let db: D1Database;

beforeEach(async () => {
  db = await useTestDb(`${SEED}
    INSERT INTO newsletter_subscribers (email, status, subscribed_at, unsubscribe_token) VALUES
      ('a@exemple.fr', 'subscribed', datetime('now'), 'tok-a'),
      ('b@exemple.fr', 'subscribed', datetime('now'), 'tok-b');
  `);
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/admin/articles/:id" element={<AdminArticleFormPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function announcements(): Promise<number> {
  const row = await db
    .prepare('SELECT count(*) AS n FROM article_announcements')
    .first<{ n: number }>();
  return row?.n ?? 0;
}

describe('AA-6 announcing an avis from its editor', () => {
  it('leaves the box unticked, and saving alone mails nobody', async () => {
    const user = userEvent.setup();
    renderAt('/admin/articles/un-dernier-ete');

    const block = await screen.findByTestId('article-announce');
    const box = within(block).getByRole('checkbox', { name: 'Prévenir les abonné·es' });
    expect(box).not.toBeChecked();

    await user.click(screen.getByRole('button', { name: /^Enregistrer/ }));
    expect(await screen.findByText(/Enregistré/)).toBeInTheDocument();
    expect(await announcements()).toBe(0);
  });

  it('announces an already-published avis on the next save once ticked', async () => {
    const user = userEvent.setup();
    renderAt('/admin/articles/un-dernier-ete');

    const block = await screen.findByTestId('article-announce');
    await user.click(within(block).getByRole('checkbox', { name: 'Prévenir les abonné·es' }));
    expect(within(block).getByText('L’e-mail partira à l’enregistrement.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Enregistrer/ }));
    expect(await within(block).findByText('Annonce envoyée à 2 abonné·es.')).toBeInTheDocument();
    expect(within(block).getByText(/Abonné·es prévenu·es le/)).toBeInTheDocument();
    expect(within(block).queryByRole('checkbox')).not.toBeInTheDocument();
    expect(await announcements()).toBe(1);
  });

  it('holds a ticked draft until it is published', async () => {
    const user = userEvent.setup();
    renderAt('/admin/articles/contre-champs');

    const block = await screen.findByTestId('article-announce');
    await user.click(within(block).getByRole('checkbox', { name: 'Prévenir les abonné·es' }));
    expect(within(block).getByText('L’e-mail partira à la publication.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^Enregistrer/ }));
    expect(await screen.findByText(/Enregistré/)).toBeInTheDocument();
    expect(await announcements()).toBe(0);

    await user.click(screen.getByRole('button', { name: 'Publier' }));
    expect(await within(block).findByText('Annonce envoyée à 2 abonné·es.')).toBeInTheDocument();
    expect(await announcements()).toBe(1);
  });

  it('offers a proof copy where test sends are on (the suite, like .dev.vars)', async () => {
    renderAt('/admin/articles/un-dernier-ete');
    const block = await screen.findByTestId('article-announce');
    expect(within(block).getByLabelText('Adresse de test')).toBeInTheDocument();
  });

  it('shows when an announced avis went out instead of the box', async () => {
    await db.exec(`
      INSERT INTO article_announcements (article_id, subject, title, sent_at, recipient_count)
      VALUES ('un-dernier-ete', 'S', 'Un dernier été', '2026-07-18 08:00:00', 2);
    `);
    renderAt('/admin/articles/un-dernier-ete');

    const block = await screen.findByTestId('article-announce');
    expect(within(block).getByText('Abonné·es prévenu·es le 18 juil. 2026 à 10:00.')).toBeInTheDocument();
    expect(within(block).queryByRole('checkbox')).not.toBeInTheDocument();
  });
});
