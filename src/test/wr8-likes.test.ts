import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as likesRoute } from '../../functions/api/likes';
import { createTestDb } from './d1';
import { TEST_ENV } from './api-server';
import { SEED } from './fixtures';
import type { D1Database } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(() => {
  db = createTestDb();
  db.exec(SEED);
});

/** `ip` becomes CF-Connecting-IP — the header Cloudflare sets and nobody can forge. */
function like(body: unknown, ip = '203.0.113.7', env = { ...TEST_ENV, DB: db }) {
  return likesRoute({
    request: new Request('http://localhost/api/likes', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
      body: JSON.stringify(body),
    }),
    env,
  });
}

const AVIS = { targetType: 'article', targetId: 'un-dernier-ete' };

describe('WR-8 toggling', () => {
  it('reports the caller is now in the count, recomputed from the registry', async () => {
    const response = await like(AVIS);
    expect(response.status).toBe(200);
    // One registry row, so one like — *not* the seeded 128. That number is
    // demo data with nothing behind it, and the first real toggle replaces it
    // with the truth. Production ships an empty database, where the counter and
    // the registry start out agreeing.
    expect(await response.json()).toEqual({ likes: 1, liked: true });
  });

  it('a second click from the same address takes it back off', async () => {
    await like(AVIS);
    const response = await like(AVIS);
    const body = await response.json();
    expect(body.liked).toBe(false);

    const row = await db
      .prepare("SELECT count(*) AS total FROM likes WHERE target_id = 'un-dernier-ete'")
      .first<{ total: number }>();
    expect(row?.total).toBe(0);
  });

  it('counts one address once, however many times it asks', async () => {
    await like(AVIS);
    await like(AVIS);
    await like(AVIS);
    const row = await db
      .prepare("SELECT count(*) AS total FROM likes WHERE target_id = 'un-dernier-ete'")
      .first<{ total: number }>();
    // Three clicks, an odd number: liked, unliked, liked again.
    expect(row?.total).toBe(1);
  });

  it('counts two addresses twice', async () => {
    const first = await (await like(AVIS, '203.0.113.7')).json();
    const second = await (await like(AVIS, '198.51.100.4')).json();
    expect(second.likes).toBe(first.likes + 1);
  });

  it('recomputes the counter rather than incrementing it', async () => {
    // The stored counter and the registry must never be able to drift, which is
    // what a raw `likes = likes + 1` would eventually allow.
    await like(AVIS, '203.0.113.7');
    await like(AVIS, '198.51.100.4');

    const stored = await db
      .prepare("SELECT likes FROM articles WHERE id = 'un-dernier-ete'")
      .first<{ likes: number }>();
    const registry = await db
      .prepare("SELECT count(*) AS total FROM likes WHERE target_type = 'article' AND target_id = 'un-dernier-ete'")
      .first<{ total: number }>();
    expect(stored?.likes).toBe(registry?.total);
  });

  it('never stores the address itself', async () => {
    await like(AVIS, '203.0.113.7');
    const row = await db
      .prepare("SELECT ip_hash FROM likes WHERE target_id = 'un-dernier-ete'")
      .first<{ ip_hash: string }>();
    expect(row?.ip_hash).not.toContain('203.0.113.7');
    expect(row?.ip_hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('WR-8 targets', () => {
  it('works on a bilan and on a comment too', async () => {
    expect((await like({ targetType: 'bilan', targetId: '2026-07' })).status).toBe(200);
    expect((await like({ targetType: 'comment', targetId: 'c-article-1' })).status).toBe(200);
  });

  it('refuses a target that does not exist — `likes` has no foreign key to say so', async () => {
    const response = await like({ targetType: 'article', targetId: 'fantome' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : targetId.' });
  });

  it('refuses an unknown target type', async () => {
    const response = await like({ targetType: 'newsletter', targetId: 'x' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : targetType.' });
  });
});

describe('WR-8 fail-closed', () => {
  it('answers 500 without IP_SALT rather than counting without dedup', async () => {
    // A counter anyone can raise without limit is worse than no counter.
    const { IP_SALT: _unused, ...withoutSalt } = TEST_ENV;
    const response = await like(AVIS, '203.0.113.7', { ...withoutSalt, DB: db });
    expect(response.status).toBe(500);
  });
});
