/**
 * The public read endpoints, called directly.
 *
 * These go through the real handlers and the real SQL — `createTestDb` applies
 * the project's own migrations — so a query that stops matching its schema fails
 * here rather than in production. What they check is the part a page test cannot
 * see: the status codes, the shape of the JSON, and that a draft never leaves
 * the server.
 */
import { describe, expect, it } from 'vitest';
import { createTestDb } from './d1';
import { SEED } from './fixtures';
import { TEST_ENV, signTestToken } from './api-server';
import { onRequestGet as feed, onRequest as feedRoute } from '../../functions/api/feed';
import { onRequestGet as articles } from '../../functions/api/articles/index';
import { onRequestGet as article } from '../../functions/api/articles/[id]';
import { onRequestGet as bilans } from '../../functions/api/bilans/index';
import { onRequestGet as bilan } from '../../functions/api/bilans/[id]';
import { onRequestGet as apropos } from '../../functions/api/pages/apropos';
import { onRequestGet as meSuivre } from '../../functions/api/pages/me-suivre';
import type { Env } from '../../functions/types';

/** An env with a seeded database behind it. Pass no SQL for an empty one. */
function env(sql = SEED): Env {
  const db = createTestDb();
  if (sql) db.exec(sql);
  return { ...TEST_ENV, DB: db };
}

function get(url: string, headers: Record<string, string> = {}): Request {
  return new Request(`http://localhost${url}`, { headers });
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe('DB-3 /api/feed', () => {
  it('returns a medium’s published avis, newest first', async () => {
    const response = await feed({ request: get('/api/feed?medium=film'), env: env() });
    expect(response.status).toBe(200);

    const body = await json<{ items: Array<{ id: string; status: string }> }>(response);
    expect(body.items.map((item) => item.id)).toEqual(['un-dernier-ete']);
    expect(body.items.every((item) => item.status === 'published')).toBe(true);
  });

  it('never returns a draft, whatever the medium', async () => {
    const response = await feed({ request: get('/api/feed'), env: env() });
    const body = await json<{ items: Array<{ id: string }> }>(response);
    // The seed's draft is a série; asking for everything must still not surface it.
    expect(body.items.map((item) => item.id)).not.toContain('contre-champs');
  });

  it('rejects an unknown medium rather than quietly widening the query', async () => {
    const response = await feed({ request: get('/api/feed?medium=flim'), env: env() });
    expect(response.status).toBe(400);
    expect(await json<{ error: string }>(response)).toEqual({
      error: 'Paramètre invalide : medium.',
    });
  });

  it('caps the limit, and refuses one that is not a positive integer', async () => {
    for (const bad of ['0', '-1', 'abc', '3.5', '9999']) {
      const response = await feed({ request: get(`/api/feed?limit=${bad}`), env: env() });
      expect(response.status).toBe(400);
    }
  });

  it('answers 500 without a binding and 503 when the tables are missing', async () => {
    expect((await feed({ request: get('/api/feed'), env: TEST_ENV })).status).toBe(500);

    const { DB } = env('');
    // A database with no schema at all — what an unmigrated deployment looks like.
    const bare = { ...TEST_ENV, DB: { ...DB!, prepare: () => { throw new Error('no such table'); } } };
    expect((await feed({ request: get('/api/feed'), env: bare as Env })).status).toBe(503);
  });

  it('answers 405 to anything but GET, and says so', async () => {
    const response = await feedRoute({
      request: new Request('http://localhost/api/feed', { method: 'POST' }),
      env: env(),
    });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });
});

describe('DB-3 /api/articles', () => {
  it('paginates and reports the total for the filter, not for the page', async () => {
    const response = await articles({
      request: get('/api/articles?perPage=1&page=1'),
      env: env(),
    });
    const body = await json<{ items: unknown[]; total: number; page: number; perPage: number }>(
      response,
    );
    expect(body.items).toHaveLength(1);
    // Two published avis in the seed; the draft is not one of them.
    expect(body).toMatchObject({ total: 2, page: 1, perPage: 1 });
  });

  it('returns an empty page rather than an error past the last one', async () => {
    const response = await articles({ request: get('/api/articles?page=99'), env: env() });
    expect(response.status).toBe(200);
    expect((await json<{ items: unknown[] }>(response)).items).toEqual([]);
  });
});

describe('DB-3 /api/articles/:id', () => {
  it('assembles the avis, its neighbours, its links, its bilan and its thread', async () => {
    const response = await article({
      request: get('/api/articles/un-dernier-ete'),
      env: env(),
      params: { id: 'un-dernier-ete' },
    });
    expect(response.status).toBe(200);

    const body = await json<{
      article: { id: string; comments: number };
      related: Array<{ id: string; note: string }>;
      prev: { id: string } | null;
      next: { id: string } | null;
      bilan: { id: string; monthLabel: string } | null;
      comments: Array<{ id: string; date?: string; reply?: { isAuthor?: boolean; date?: string } }>;
    }>(response);

    expect(body.article.id).toBe('un-dernier-ete');
    expect(body.related.map((item) => item.id)).toEqual(['l-annee-de-la-pluie']);
    // Newest avis of the seed: a previous one, no next one.
    expect(body.prev?.id).toBe('l-annee-de-la-pluie');
    expect(body.next).toBeNull();
    expect(body.bilan).toMatchObject({ id: '2026-07', monthLabel: 'Juillet' });

    // The thread comes back nested: one root, one reply, no orphan.
    expect(body.comments).toHaveLength(1);
    expect(body.comments[0].reply?.isAuthor).toBe(true);
    // The author's reply is undated on purpose, and stays absent rather than ''.
    expect(body.comments[0].reply?.date).toBeUndefined();
    // The count is derived from the rows, replies included.
    expect(body.article.comments).toBe(2);
  });

  it('404s an unknown id and a draft alike — a draft is not a preview', async () => {
    for (const id of ['inconnu', 'contre-champs']) {
      const response = await article({
        request: get(`/api/articles/${id}`),
        env: env(),
        params: { id },
      });
      expect(response.status).toBe(404);
    }
  });
});

describe('DB-3 /api/articles/:id recording a view', () => {
  const views = async (database: Env) =>
    (await database.DB!.prepare("SELECT views FROM articles WHERE id = 'un-dernier-ete'").first<{
      views: number;
    }>())?.views;
  const hits = async (database: Env) =>
    (await database.DB!
      .prepare("SELECT count(*) AS total FROM view_hits WHERE target_type = 'article' AND target_id = 'un-dernier-ete'")
      .first<{ total: number }>())?.total;

  it('logs a hit and increments the counter for an ordinary reader', async () => {
    const database = env();
    await article({ request: get('/api/articles/un-dernier-ete'), env: database, params: { id: 'un-dernier-ete' } });
    expect(await views(database)).toBe(2181); // SEED seeds 2180
    expect(await hits(database)).toBe(1);
  });

  it('does not count a crawler’s visit', async () => {
    const database = env();
    await article({
      request: get('/api/articles/un-dernier-ete', {
        'user-agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)',
      }),
      env: database,
      params: { id: 'un-dernier-ete' },
    });
    expect(await views(database)).toBe(2180);
    expect(await hits(database)).toBe(0);
  });

  it('does not count the signed-in editor’s own visit', async () => {
    const database = env();
    const token = await signTestToken();
    await article({
      request: get('/api/articles/un-dernier-ete', { authorization: `Bearer ${token}` }),
      env: database,
      params: { id: 'un-dernier-ete' },
    });
    expect(await views(database)).toBe(2180);
    expect(await hits(database)).toBe(0);
  });
});

describe('DB-3 /api/bilans', () => {
  it('summarises each month with its chips, its count and its first covers', async () => {
    const response = await bilans({ request: get('/api/bilans'), env: env() });
    const body = await json<{
      items: Array<{ id: string; counts: Record<string, number>; avisCount: number; covers: string[] }>;
    }>(response);

    expect(body.items).toHaveLength(1);
    // The chips are stored, not counted: an archive month keeps them without
    // carrying its avis.
    expect(body.items[0].counts).toEqual({ film: 1, livre: 1 });
    expect(body.items[0].avisCount).toBe(2);
    expect(body.items[0].covers).toHaveLength(2);
  });

  it('answers an empty list on an empty database, not an error', async () => {
    const response = await bilans({ request: get('/api/bilans'), env: env('') });
    expect(response.status).toBe(200);
    expect((await json<{ items: unknown[] }>(response)).items).toEqual([]);
  });
});

describe('DB-3 /api/bilans/:id', () => {
  it('returns the month with its avis in editorial order', async () => {
    const response = await bilan({
      request: get('/api/bilans/2026-07'),
      env: env(),
      params: { id: '2026-07' },
    });
    const body = await json<{ bilan: { avis: Array<{ id: string }> }; comments: unknown[] }>(
      response,
    );
    // Position order, not medium order and not date order.
    expect(body.bilan.avis.map((item) => item.id)).toEqual([
      'un-dernier-ete',
      'l-annee-de-la-pluie',
    ]);
    expect(body.comments).toHaveLength(1);
  });

  it('resolves `latest` to the newest month, and 404s it on an empty database', async () => {
    const found = await bilan({
      request: get('/api/bilans/latest'),
      env: env(),
      params: { id: 'latest' },
    });
    expect((await json<{ bilan: { id: string } }>(found)).bilan.id).toBe('2026-07');

    const empty = await bilan({
      request: get('/api/bilans/latest'),
      env: env(''),
      params: { id: 'latest' },
    });
    expect(empty.status).toBe(404);
  });
});

describe('DB-3 /api/bilans/:id recording a view', () => {
  const views = async (database: Env) =>
    (await database.DB!.prepare("SELECT views FROM bilans WHERE id = '2026-07'").first<{ views: number }>())
      ?.views;

  it('logs a hit and increments the counter, resolving `latest` to the real id first', async () => {
    const database = env();
    await bilan({ request: get('/api/bilans/latest'), env: database, params: { id: 'latest' } });
    expect(await views(database)).toBe(3421); // SEED seeds 3420
    const hits = await database.DB!
      .prepare("SELECT target_id FROM view_hits WHERE target_type = 'bilan'")
      .first<{ target_id: string }>();
    expect(hits?.target_id).toBe('2026-07');
  });

  it('does not count a crawler’s or the editor’s own visit', async () => {
    const database = env();
    const token = await signTestToken();
    await bilan({
      request: get('/api/bilans/2026-07', { 'user-agent': 'facebookexternalhit/1.1' }),
      env: database,
      params: { id: '2026-07' },
    });
    await bilan({
      request: get('/api/bilans/2026-07', { authorization: `Bearer ${token}` }),
      env: database,
      params: { id: '2026-07' },
    });
    expect(await views(database)).toBe(3420);
  });
});

describe('DB-3 /api/pages', () => {
  it('splits the bio into paragraphs and the emphasis into terms', async () => {
    const response = await apropos({ request: get('/api/pages/apropos'), env: env() });
    const body = await json<{ bio: string[]; bioEmphasis: string[]; stats: unknown[] }>(response);

    expect(body.bio).toHaveLength(2);
    expect(body.bioEmphasis).toEqual(['un bilan']);
    expect(body.stats).toHaveLength(2);
  });

  it('returns the social links in their stored order', async () => {
    const response = await meSuivre({ request: get('/api/pages/me-suivre'), env: env() });
    const body = await json<{ socials: Array<{ key: string }> }>(response);
    expect(body.socials.map((social) => social.key)).toEqual([
      'threads',
      'letterboxd',
      'babelio',
      'linkedin',
    ]);
  });

  it('404s a page that was never written', async () => {
    const response = await apropos({ request: get('/api/pages/apropos'), env: env('') });
    expect(response.status).toBe(404);
  });
});
