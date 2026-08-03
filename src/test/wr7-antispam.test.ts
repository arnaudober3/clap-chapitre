import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as commentsRoute } from '../../functions/api/comments';
import { onRequest as articleRoute } from '../../functions/api/articles/[id]';
import { createTestDb } from './d1';
import { TEST_ENV } from './api-server';
import { SEED } from './fixtures';
import type { D1Database } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(() => {
  db = createTestDb();
  db.exec(SEED);
});

/** A composer that has been on screen long enough to be read. */
const READ = () => Date.now() - 10_000;

function post(body: unknown, ip = '203.0.113.7', env = { ...TEST_ENV, DB: db }) {
  return commentsRoute({
    request: new Request('http://localhost/api/comments', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
      body: JSON.stringify(body),
    }),
    env,
  });
}

const COMMENT = {
  targetType: 'article',
  targetId: 'un-dernier-ete',
  author: 'Sacha',
  body: 'Très juste.',
  trap: '',
};

const total = async (where: string) =>
  (await db.prepare(`SELECT count(*) AS total FROM comments WHERE ${where}`).first<{ total: number }>())
    ?.total ?? 0;

describe('WR-7 the honeypot', () => {
  it('answers like a success and writes nothing', async () => {
    const response = await post({ ...COMMENT, trap: 'http://spam.example', openedAt: READ() });
    // Same 201 a visitor gets. A 400 here would teach the bot what to change.
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ queued: true });
    expect(await total("author = 'Sacha'")).toBe(0);
  });
});

describe('WR-7 the minimum delay', () => {
  it('refuses a form submitted in under three seconds, silently', async () => {
    const response = await post({ ...COMMENT, openedAt: Date.now() });
    expect(response.status).toBe(201);
    expect(await total("author = 'Sacha'")).toBe(0);
  });

  it('treats a missing or nonsensical openedAt as too fast', async () => {
    // What a script that never rendered the form would send. `null` and `0` are
    // the interesting ones: `Number(null)` is 0, which reads as "opened at the
    // epoch" and would sail past a lower bound alone.
    for (const openedAt of [undefined, 'bientôt', null, 0, Date.now() + 60_000]) {
      await post({ ...COMMENT, openedAt });
    }
    expect(await total("author = 'Sacha'")).toBe(0);
  });

  it('accepts one that waited', async () => {
    const response = await post({ ...COMMENT, openedAt: READ() });
    expect(response.status).toBe(201);
    expect(await total("author = 'Sacha'")).toBe(1);
  });
});

describe('WR-7 the sliding window', () => {
  it('lets five through and refuses the sixth from the same address', async () => {
    for (let i = 1; i <= 5; i += 1) {
      const response = await post({ ...COMMENT, body: `Message ${i}`, openedAt: READ() });
      expect(response.status).toBe(201);
    }

    const sixth = await post({ ...COMMENT, body: 'Message 6', openedAt: READ() });
    expect(sixth.status).toBe(429);
    expect((await sixth.json()).error).toMatch(/Réessayez/);
    expect(await total("author = 'Sacha'")).toBe(5);
  });

  it('counts per address, not globally', async () => {
    for (let i = 1; i <= 5; i += 1) {
      await post({ ...COMMENT, body: `A${i}`, openedAt: READ() }, '203.0.113.7');
    }
    // Someone else's quarter hour is their own.
    const other = await post({ ...COMMENT, body: 'B1', openedAt: READ() }, '198.51.100.4');
    expect(other.status).toBe(201);
  });

  it('records the refused attempt too — the window is not served one at a time', async () => {
    for (let i = 1; i <= 6; i += 1) {
      await post({ ...COMMENT, body: `M${i}`, openedAt: READ() });
    }
    const hits = await db
      .prepare("SELECT count(*) AS total FROM rate_hits WHERE bucket = 'comment'")
      .first<{ total: number }>();
    expect(hits?.total).toBe(6);
  });

  it('does not spend the window on a request the honeypot caught', async () => {
    // The cheap guards run first, so a bot never costs the queue two queries.
    await post({ ...COMMENT, trap: 'spam', openedAt: READ() });
    const hits = await db
      .prepare("SELECT count(*) AS total FROM rate_hits")
      .first<{ total: number }>();
    expect(hits?.total).toBe(0);
  });
});

describe('WR-7 coherence', () => {
  it('refuses a target that does not exist', async () => {
    const response = await post({ ...COMMENT, targetId: 'fantome', openedAt: READ() });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : targetId.' });
  });

  it('refuses an unpublished target — a visitor cannot have read a draft', async () => {
    const response = await post({ ...COMMENT, targetId: 'contre-champs', openedAt: READ() });
    expect(response.status).toBe(422);
  });

  it('refuses a reply to a reply: the thread is one level deep', async () => {
    // The trigger would abort the INSERT anyway, but as a 503 naming nothing.
    const response = await post({
      ...COMMENT,
      parentId: 'c-article-1-reply',
      openedAt: READ(),
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : parentId.' });
  });

  it('refuses a reply aimed at another page’s thread', async () => {
    const response = await post({
      ...COMMENT,
      targetType: 'bilan',
      targetId: '2026-07',
      parentId: 'c-article-1',
      openedAt: READ(),
    });
    expect(response.status).toBe(422);
  });
});

describe('WR-7 moderation is the guard that holds', () => {
  it('stores the comment pending, and the public thread does not show it', async () => {
    await post({ ...COMMENT, openedAt: READ() });

    const row = await db
      .prepare("SELECT status, created_at FROM comments WHERE author = 'Sacha'")
      .first<{ status: string; created_at: string }>();
    expect(row?.status).toBe('pending');
    expect(row?.created_at).toMatch(/^\d{4}-\d{2}-\d{2} /);

    const view = await articleRoute({
      request: new Request('http://localhost/api/articles/un-dernier-ete'),
      env: { ...TEST_ENV, DB: db },
      params: { id: 'un-dernier-ete' },
    });
    const payload = await view.json();
    const authors = payload.comments.flatMap((entry: { author: string; reply?: { author: string } }) =>
      [entry.author, entry.reply?.author].filter(Boolean),
    );
    expect(authors).not.toContain('Sacha');
  });

  it('keeps the card count on approved entries only', async () => {
    const before = await db
      .prepare(
        `SELECT count(*) AS total FROM comments
          WHERE target_type = 'article' AND target_id = 'un-dernier-ete'
            AND status = 'approved'`,
      )
      .first<{ total: number }>();

    await post({ ...COMMENT, openedAt: READ() });

    const view = await articleRoute({
      request: new Request('http://localhost/api/articles/un-dernier-ete'),
      env: { ...TEST_ENV, DB: db },
      params: { id: 'un-dernier-ete' },
    });
    // A card announcing more comments than the thread shows would read as a
    // bug, and would leak the size of the backlog to every visitor.
    expect((await view.json()).article.comments).toBe(before?.total);
  });
});

describe('WR-7 fail-closed', () => {
  it('answers 500 without IP_SALT rather than accepting comments unthrottled', async () => {
    const { IP_SALT: _unused, ...withoutSalt } = TEST_ENV;
    const response = await post({ ...COMMENT, openedAt: READ() }, '203.0.113.7', {
      ...withoutSalt,
      DB: db,
    });
    expect(response.status).toBe(500);
  });
});
