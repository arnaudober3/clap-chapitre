import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as articlesRoute } from '../../functions/api/admin/articles/index';
import { onRequest as articleRoute } from '../../functions/api/admin/articles/[id]';
import { createTestDb } from './d1';
import { TEST_ENV, signTestToken } from './api-server';
import { SEED } from './fixtures';
import type { D1Database } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(() => {
  db = createTestDb();
  db.exec(SEED);
});

async function send(
  path: string,
  method: string,
  body?: unknown,
  params?: Record<string, string>,
  token = true,
) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${await signTestToken()}`;

  const handler = params?.id ? articleRoute : articlesRoute;
  return handler({
    request: new Request(`http://localhost${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env: { ...TEST_ENV, DB: db },
    params,
  });
}

const AVIS = {
  title: 'Une nuit blanche',
  medium: 'film',
  excerpt: 'Un film qui ne dort jamais.',
  cover: '',
  status: 'draft',
  hook: 'Et si la nuit ne finissait pas ?',
};

describe('WR-3 the gate', () => {
  it('refuses every write without a token — the admin routes hand out drafts', async () => {
    for (const [path, method, params] of [
      ['/api/admin/articles', 'POST', undefined],
      ['/api/admin/articles/un-dernier-ete', 'PUT', { id: 'un-dernier-ete' }],
      ['/api/admin/articles/un-dernier-ete', 'DELETE', { id: 'un-dernier-ete' }],
    ] as const) {
      const response = await send(path, method, AVIS, params, false);
      expect(response.status).toBe(401);
    }
  });
});

describe('WR-3 POST /api/admin/articles', () => {
  it('creates a draft, deriving its id from the title', async () => {
    const response = await send('/api/admin/articles', 'POST', AVIS);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'une-nuit-blanche' });

    const row = await db
      .prepare('SELECT title, medium, status, published_at, hook FROM articles WHERE id = ?')
      .bind('une-nuit-blanche')
      .first();
    expect(row).toEqual({
      title: 'Une nuit blanche',
      medium: 'film',
      status: 'draft',
      // The schema's CHECK pairs the two; a draft has no date.
      published_at: null,
      hook: 'Et si la nuit ne finissait pas ?',
    });
  });

  it('folds accents into the id, exactly as the search expression does', async () => {
    await send('/api/admin/articles', 'POST', { ...AVIS, title: 'L’été à Naples' });
    const row = await db.prepare("SELECT id FROM articles WHERE title = 'L’été à Naples'").first();
    expect(row?.id).toBe('l-ete-a-naples');
  });

  it('suffixes a colliding id rather than refusing — two works can share a title', async () => {
    await send('/api/admin/articles', 'POST', AVIS);
    const second = await send('/api/admin/articles', 'POST', AVIS);
    expect(await second.json()).toEqual({ id: 'une-nuit-blanche-2' });
  });

  it('stamps published_at when created straight as published', async () => {
    await send('/api/admin/articles', 'POST', { ...AVIS, status: 'published' });
    const row = await db
      .prepare("SELECT status, published_at FROM articles WHERE id = 'une-nuit-blanche'")
      .first<{ status: string; published_at: string | null }>();
    expect(row?.status).toBe('published');
    expect(row?.published_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('names the offending field on a bad payload', async () => {
    const response = await send('/api/admin/articles', 'POST', { ...AVIS, medium: 'flim' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : medium.' });
  });

  it('refuses a cover that is not a key we minted', async () => {
    // The only field whose value the client invents — everything else is prose.
    const response = await send('/api/admin/articles', 'POST', {
      ...AVIS,
      cover: '../../secrets',
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : cover.' });
  });

  it('refuses half a "à rapprocher de" callout — the schema pairs them', async () => {
    const response = await send('/api/admin/articles', 'POST', {
      ...AVIS,
      relatedToTitle: 'Un autre film',
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : relatedTo.' });
  });

  it('answers 422 rather than 503 when a related avis does not exist', async () => {
    // Checked before the batch: a foreign key abort is indistinguishable from
    // "the migrations were never applied", and the two need different fixes.
    const response = await send('/api/admin/articles', 'POST', {
      ...AVIS,
      related: [{ id: 'un-film-fantome', note: 'Voisin' }],
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : related.' });
  });
});

describe('WR-3 PUT /api/admin/articles/:id', () => {
  const params = { id: 'un-dernier-ete' };

  it('replaces the avis and clears the optionals the payload omits', async () => {
    const response = await send(
      '/api/admin/articles/un-dernier-ete',
      'PUT',
      { ...AVIS, title: 'Un dernier été', status: 'published' },
      params,
    );
    expect(response.status).toBe(200);

    const row = await db
      .prepare('SELECT title, hook, pull_quote, updated_at FROM articles WHERE id = ?')
      .bind('un-dernier-ete')
      .first<{ hook: string; pull_quote: string | null; updated_at: string }>();
    expect(row?.hook).toBe('Et si la nuit ne finissait pas ?');
    // A PUT replaces: an omitted optional is the editor clearing it, which is
    // the whole reason this is not a PATCH.
    expect(row?.pull_quote).toBeNull();
    expect(row?.updated_at).toMatch(/^\d{4}-\d{2}-\d{2} /);
  });

  it('keeps the original published_at when re-saving a live avis', async () => {
    const before = await db
      .prepare("SELECT published_at FROM articles WHERE id = 'un-dernier-ete'")
      .first<{ published_at: string }>();

    await send(
      '/api/admin/articles/un-dernier-ete',
      'PUT',
      { ...AVIS, title: 'Un dernier été', status: 'published' },
      params,
    );

    const after = await db
      .prepare("SELECT published_at FROM articles WHERE id = 'un-dernier-ete'")
      .first<{ published_at: string }>();
    // Only the first publication stamps a date; a save must not restamp it.
    expect(after?.published_at).toBe(before?.published_at);
  });

  it('clears published_at when unpublishing, as the CHECK demands', async () => {
    await send(
      '/api/admin/articles/un-dernier-ete',
      'PUT',
      { ...AVIS, title: 'Un dernier été', status: 'draft' },
      params,
    );
    const row = await db
      .prepare("SELECT status, published_at FROM articles WHERE id = 'un-dernier-ete'")
      .first();
    expect(row).toEqual({ status: 'draft', published_at: null });
  });

  it('404s on an avis that is not there', async () => {
    const response = await send('/api/admin/articles/fantome', 'PUT', AVIS, { id: 'fantome' });
    expect(response.status).toBe(404);
  });
});

describe('WR-3 DELETE /api/admin/articles/:id', () => {
  it('removes the avis, its bilan links and its thread', async () => {
    const response = await send(
      '/api/admin/articles/un-dernier-ete',
      'DELETE',
      undefined,
      { id: 'un-dernier-ete' },
    );
    expect(response.status).toBe(204);

    const counts = await db
      .prepare(
        `SELECT
           (SELECT count(*) FROM articles WHERE id = 'un-dernier-ete') AS avis,
           (SELECT count(*) FROM bilan_avis WHERE article_id = 'un-dernier-ete') AS links,
           (SELECT count(*) FROM comments
             WHERE target_type = 'article' AND target_id = 'un-dernier-ete') AS thread`,
      )
      .first();
    // The links cascade; the thread does not — `comments.target_id` carries no
    // foreign key, so the handler has to clear it by hand.
    expect(counts).toEqual({ avis: 0, links: 0, thread: 0 });
  });

  it('leaves the bilan itself standing, minus that one card', async () => {
    await send('/api/admin/articles/un-dernier-ete', 'DELETE', undefined, {
      id: 'un-dernier-ete',
    });
    const bilan = await db.prepare("SELECT id FROM bilans WHERE id = '2026-07'").first();
    expect(bilan).not.toBeNull();
  });

  it('404s twice in a row rather than reporting a second success', async () => {
    const params = { id: 'un-dernier-ete' };
    expect((await send('/api/admin/articles/un-dernier-ete', 'DELETE', undefined, params)).status).toBe(204);
    expect((await send('/api/admin/articles/un-dernier-ete', 'DELETE', undefined, params)).status).toBe(404);
  });
});
