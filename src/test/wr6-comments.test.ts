import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as queueRoute } from '../../functions/api/admin/comments/index';
import { onRequest as commentRoute } from '../../functions/api/admin/comments/[id]';
import { onRequest as commentsRoute } from '../../functions/api/comments';
import { onRequest as articleRoute } from '../../functions/api/articles/[id]';
import { createTestDb } from './d1';
import { TEST_ENV, signTestToken } from './api-server';
import { SEED } from './fixtures';
import type { D1Database } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(() => {
  db = createTestDb();
  db.exec(SEED);
});

const env = () => ({ ...TEST_ENV, DB: db });

async function admin(path: string, method: string, body?: unknown, params?: Record<string, string>) {
  const handler = params?.id ? commentRoute : queueRoute;
  return handler({
    request: new Request(`http://localhost${path}`, {
      method,
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${await signTestToken()}`,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env: env(),
    params,
  });
}

/** Drop a comment through the public endpoint, so it lands pending like a real one. */
function drop(over: Record<string, unknown> = {}) {
  return commentsRoute({
    request: new Request('http://localhost/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': '203.0.113.7' },
      body: JSON.stringify({
        targetType: 'article',
        targetId: 'un-dernier-ete',
        author: 'Sacha',
        body: 'Très juste.',
        trap: '',
        openedAt: Date.now() - 10_000,
        ...over,
      }),
    }),
    env: env(),
  });
}

async function publicAuthors(): Promise<string[]> {
  const response = await articleRoute({
    request: new Request('http://localhost/api/articles/un-dernier-ete'),
    env: env(),
    params: { id: 'un-dernier-ete' },
  });
  const payload = await response.json();
  return payload.comments.flatMap(
    (entry: { author: string; reply?: { author: string } }) =>
      [entry.author, entry.reply?.author].filter(Boolean) as string[],
  );
}

describe('WR-6 the queue', () => {
  it('needs the admin token — it lists what nobody may read yet', async () => {
    const response = await queueRoute({
      request: new Request('http://localhost/api/admin/comments'),
      env: env(),
    });
    expect(response.status).toBe(401);
  });

  it('lists what is waiting, naming the page each comment is on', async () => {
    await drop();
    const payload = await (await admin('/api/admin/comments?status=pending', 'GET')).json();

    expect(payload.items).toHaveLength(1);
    expect(payload.items[0]).toMatchObject({
      author: 'Sacha',
      status: 'pending',
      targetType: 'article',
      // The queue mixes every thread, so "on which page" is the first thing a
      // moderator needs.
      targetTitle: 'Un dernier été',
      isReply: false,
    });
    expect(payload.pending).toBe(1);
  });

  it('counts the whole backlog whatever the filter, so the badge does not move', async () => {
    await drop();
    const approved = await (await admin('/api/admin/comments?status=approved', 'GET')).json();
    expect(approved.items.every((row: { status: string }) => row.status === 'approved')).toBe(true);
    expect(approved.pending).toBe(1);
  });

  it('refuses a status that is not a comment’s', async () => {
    // `published`/`draft` are an avis' states — same strictness, other vocabulary.
    const response = await admin('/api/admin/comments?status=published', 'GET');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Paramètre invalide : status.' });
  });
});

describe('WR-6 approving', () => {
  it('releases the comment onto the public thread', async () => {
    await drop();
    expect(await publicAuthors()).not.toContain('Sacha');

    const id = (await db
      .prepare("SELECT id FROM comments WHERE author = 'Sacha'")
      .first<{ id: string }>())!.id;

    const response = await admin(`/api/admin/comments/${id}`, 'PUT', { status: 'approved' }, { id });
    expect(response.status).toBe(200);
    expect(await publicAuthors()).toContain('Sacha');
  });

  it('touches status and nothing else — the triggers only guard INSERT', async () => {
    const before = await db
      .prepare("SELECT target_type, target_id, parent_id FROM comments WHERE id = 'c-article-1'")
      .first();

    await admin('/api/admin/comments/c-article-1', 'PUT', { status: 'pending' }, {
      id: 'c-article-1',
    });

    const after = await db
      .prepare("SELECT target_type, target_id, parent_id FROM comments WHERE id = 'c-article-1'")
      .first();
    // `comments_single_depth` and `comments_same_target` are BEFORE INSERT, so
    // these columns have no guard once a row exists. Not writing them is what
    // keeps that gap harmless.
    expect(after).toEqual(before);
  });

  it('can put an approved comment back in the queue', async () => {
    await admin('/api/admin/comments/c-article-1', 'PUT', { status: 'pending' }, {
      id: 'c-article-1',
    });
    expect(await publicAuthors()).not.toContain('Camille');
  });

  it('refuses a status outside the two, and 404s on a missing comment', async () => {
    const bad = await admin('/api/admin/comments/c-article-1', 'PUT', { status: 'publié' }, {
      id: 'c-article-1',
    });
    expect(bad.status).toBe(422);

    const missing = await admin('/api/admin/comments/fantome', 'PUT', { status: 'approved' }, {
      id: 'fantome',
    });
    expect(missing.status).toBe(404);
  });
});

describe('WR-6 deleting', () => {
  it('takes the nested reply with it', async () => {
    const response = await admin('/api/admin/comments/c-article-1', 'DELETE', undefined, {
      id: 'c-article-1',
    });
    expect(response.status).toBe(204);

    const left = await db
      .prepare("SELECT count(*) AS total FROM comments WHERE id IN ('c-article-1', 'c-article-1-reply')")
      .first<{ total: number }>();
    expect(left?.total).toBe(0);
  });

  it('clears the likes of both — `likes.target_id` has no foreign key', async () => {
    await db
      .prepare("INSERT INTO likes (target_type, target_id, ip_hash) VALUES ('comment', 'c-article-1', 'abc')")
      .run();

    await admin('/api/admin/comments/c-article-1', 'DELETE', undefined, { id: 'c-article-1' });

    const left = await db
      .prepare("SELECT count(*) AS total FROM likes WHERE target_type = 'comment'")
      .first<{ total: number }>();
    expect(left?.total).toBe(0);
  });

  it('404s on a second delete', async () => {
    const params = { id: 'c-article-1' };
    expect((await admin('/api/admin/comments/c-article-1', 'DELETE', undefined, params)).status).toBe(204);
    expect((await admin('/api/admin/comments/c-article-1', 'DELETE', undefined, params)).status).toBe(404);
  });
});
