import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as bilansRoute } from '../../functions/api/admin/bilans/index';
import { onRequest as bilanRoute } from '../../functions/api/admin/bilans/[id]';
import { createTestDb } from './d1';
import { TEST_ENV, signTestToken } from './api-server';
import { SEED } from './fixtures';
import type { D1Database } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(() => {
  db = createTestDb();
  db.exec(SEED);
});

async function send(method: string, body?: unknown, params?: Record<string, string>) {
  const handler = params?.id ? bilanRoute : bilansRoute;
  return handler({
    request: new Request('http://localhost/api/admin/bilans', {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${await signTestToken()}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env: { ...TEST_ENV, DB: db },
    params,
  });
}

/** SEED's two published avis — a film and a livre. */
const FILM = 'un-dernier-ete';
const LIVRE = 'l-annee-de-la-pluie';

const MONTH = {
  id: '2026-08',
  monthLabel: 'Août',
  title: 'Le mois des départs',
  status: 'draft',
  avis: [] as string[],
  edits: [] as unknown[],
};

describe('WR-4 POST /api/admin/bilans', () => {
  it('creates a month at the id it was given', async () => {
    const response = await send('POST', MONTH);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: '2026-08' });

    const row = await db
      .prepare("SELECT year, month, month_label, status FROM bilans WHERE id = '2026-08'")
      .first();
    // Year and month are derived from the id rather than trusted from the body:
    // they cannot disagree with the primary key that way.
    expect(row).toEqual({ year: 2026, month: 8, month_label: 'Août', status: 'draft' });
  });

  it('refuses a month that already exists — two "juillet 2026" is a mistake', async () => {
    const response = await send('POST', { ...MONTH, id: '2026-07' });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: 'Un bilan existe déjà pour ce mois.' });
  });

  it('refuses an id that is not AAAA-MM, naming the field', async () => {
    for (const id of ['2026-13', 'juillet', '2026-7', '26-07']) {
      const response = await send('POST', { ...MONTH, id });
      expect(response.status).toBe(422);
      expect(await response.json()).toEqual({ error: 'Champ invalide : id.' });
    }
  });

  it('answers 422 rather than 503 when the selection names a missing avis', async () => {
    const response = await send('POST', { ...MONTH, avis: ['un-avis-fantome'] });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : avis.' });
  });
});

describe('WR-4 PUT /api/admin/bilans/:id', () => {
  const params = { id: '2026-07' };

  it('stores the selection in the order it was given, with no position collision', async () => {
    // The trap this guards: `bilan_avis` carries UNIQUE (bilan_id, position),
    // so renumbering rows in place aborts mid-statement. The handler clears and
    // rewrites instead.
    const response = await send(
      'PUT',
      { ...MONTH, id: '2026-07', avis: [LIVRE, FILM] },
      params,
    );
    expect(response.status).toBe(200);

    const { results } = await db
      .prepare("SELECT article_id, position FROM bilan_avis WHERE bilan_id = '2026-07' ORDER BY position")
      .all<{ article_id: string; position: number }>();
    expect(results.map((row) => row.article_id)).toEqual([LIVRE, FILM]);
    expect(results.map((row) => row.position)).toEqual([0, 1]);
  });

  it('survives being reordered twice in a row', async () => {
    await send('PUT', { ...MONTH, id: '2026-07', avis: [LIVRE, FILM] }, params);
    const response = await send('PUT', { ...MONTH, id: '2026-07', avis: [FILM, LIVRE] }, params);
    expect(response.status).toBe(200);

    const { results } = await db
      .prepare("SELECT article_id FROM bilan_avis WHERE bilan_id = '2026-07' ORDER BY position")
      .all<{ article_id: string }>();
    expect(results.map((row) => row.article_id)).toEqual([FILM, LIVRE]);
  });

  it('recomputes the chips from the selection — they are stored, not derived', async () => {
    await send('PUT', { ...MONTH, id: '2026-07', avis: [FILM, LIVRE] }, params);
    const both = await db
      .prepare("SELECT medium, count FROM bilan_counts WHERE bilan_id = '2026-07' ORDER BY medium")
      .all<{ medium: string; count: number }>();
    expect(both.results).toEqual([
      { medium: 'film', count: 1 },
      { medium: 'livre', count: 1 },
    ]);

    // Dropping the livre must drop its chip, not leave a stale one behind.
    await send('PUT', { ...MONTH, id: '2026-07', avis: [FILM] }, params);
    const one = await db
      .prepare("SELECT medium, count FROM bilan_counts WHERE bilan_id = '2026-07'")
      .all<{ medium: string; count: number }>();
    expect(one.results).toEqual([{ medium: 'film', count: 1 }]);
  });

  it('writes the cards back into the avis — the bilan editor edits them inline', async () => {
    await send(
      'PUT',
      {
        ...MONTH,
        id: '2026-07',
        avis: [FILM],
        edits: [
          {
            id: FILM,
            title: 'Un dernier été, revu',
            excerpt: 'Toujours ce huis clos solaire.',
            hook: 'Et si c’était le premier ?',
          },
        ],
      },
      params,
    );

    const row = await db
      .prepare('SELECT title, hook, medium, status FROM articles WHERE id = ?')
      .bind(FILM)
      .first();
    expect(row).toEqual({
      title: 'Un dernier été, revu',
      hook: 'Et si c’était le premier ?',
      // Never touched by a bilan save: a month must not be able to unpublish an
      // avis or change its medium as a side effect.
      medium: 'film',
      status: 'published',
    });
  });

  it('ignores an id in the body: the URL names the month, a save is not a move', async () => {
    await send('PUT', { ...MONTH, id: '2099-01' }, params);
    expect(await db.prepare("SELECT id FROM bilans WHERE id = '2099-01'").first()).toBeNull();
    expect(await db.prepare("SELECT id FROM bilans WHERE id = '2026-07'").first()).not.toBeNull();
  });

  it('404s on a month that is not there, and on the "next" pseudo-id', async () => {
    expect((await send('PUT', MONTH, { id: '2030-01' })).status).toBe(404);
    expect((await send('PUT', MONTH, { id: 'next' })).status).toBe(404);
  });
});

describe('WR-4 DELETE /api/admin/bilans/:id', () => {
  it('removes the month and its links, and leaves the avis alone', async () => {
    const response = await send('DELETE', undefined, { id: '2026-07' });
    expect(response.status).toBe(204);

    const counts = await db
      .prepare(
        `SELECT
           (SELECT count(*) FROM bilans WHERE id = '2026-07') AS bilan,
           (SELECT count(*) FROM bilan_avis WHERE bilan_id = '2026-07') AS links,
           (SELECT count(*) FROM bilan_counts WHERE bilan_id = '2026-07') AS chips,
           (SELECT count(*) FROM articles WHERE id = '${FILM}') AS avis`,
      )
      .first();
    // Deleting a month deletes the grouping, not the reviews it grouped.
    expect(counts).toEqual({ bilan: 0, links: 0, chips: 0, avis: 1 });
  });

  it('404s on a second delete', async () => {
    expect((await send('DELETE', undefined, { id: '2026-07' })).status).toBe(204);
    expect((await send('DELETE', undefined, { id: '2026-07' })).status).toBe(404);
  });
});
