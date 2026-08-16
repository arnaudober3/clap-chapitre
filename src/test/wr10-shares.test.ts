import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as sharesRoute } from '../../functions/api/shares';
import { createTestDb } from './d1';
import { TEST_ENV } from './api-server';
import { SEED } from './fixtures';
import type { D1Database } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(() => {
  db = createTestDb();
  db.exec(SEED);
});

function post(
  body: unknown,
  headers: Record<string, string> = { 'cf-connecting-ip': '203.0.113.7' },
  env = { ...TEST_ENV, DB: db },
) {
  return sharesRoute({
    request: new Request('http://localhost/api/shares', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
    env,
  });
}

const SHARE = { targetType: 'article', targetId: 'un-dernier-ete', channel: 'facebook' };

const total = async (where = '1=1') =>
  (await db.prepare(`SELECT count(*) AS total FROM share_hits WHERE ${where}`).first<{ total: number }>())
    ?.total ?? 0;

describe('WR-10 recording a share', () => {
  it('writes a hit and answers 201', async () => {
    const response = await post(SHARE);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ recorded: true });
    expect(await total()).toBe(1);
  });

  it('works on a bilan too', async () => {
    const response = await post({ targetType: 'bilan', targetId: '2026-07', channel: 'copy' });
    expect(response.status).toBe(201);
    expect(await total("target_type = 'bilan'")).toBe(1);
  });

  it('refuses an unknown target — an anonymous caller sharing a page that never published', async () => {
    const response = await post({ ...SHARE, targetId: 'fantome' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : targetId.' });
    expect(await total()).toBe(0);
  });

  it('refuses a draft — nothing to have shared yet', async () => {
    const response = await post({ ...SHARE, targetId: 'contre-champs' });
    expect(response.status).toBe(422);
    expect(await total()).toBe(0);
  });

  it('refuses an unknown channel', async () => {
    const response = await post({ ...SHARE, channel: 'myspace' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : channel.' });
  });
});

describe('WR-10 crawlers', () => {
  it('answers like a success and writes nothing for a crawler User-Agent', async () => {
    const response = await post(SHARE, {
      'cf-connecting-ip': '203.0.113.7',
      'user-agent': 'Mozilla/5.0 (compatible; SomeBot/1.0; +http://example.com/bot)',
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ recorded: true });
    expect(await total()).toBe(0);
  });
});

describe('WR-10 the sliding window', () => {
  it('lets twenty through and refuses the twenty-first from the same address', async () => {
    for (let i = 1; i <= 20; i += 1) {
      const response = await post(SHARE);
      expect(response.status).toBe(201);
    }
    const refused = await post(SHARE);
    expect(refused.status).toBe(429);
    expect(await total()).toBe(20);
  });

  it('counts per address, not globally', async () => {
    for (let i = 1; i <= 20; i += 1) {
      await post(SHARE, { 'cf-connecting-ip': '203.0.113.7' });
    }
    const other = await post(SHARE, { 'cf-connecting-ip': '198.51.100.4' });
    expect(other.status).toBe(201);
  });
});

describe('WR-10 fail-closed', () => {
  it('answers 500 without IP_SALT rather than accepting shares unthrottled', async () => {
    const { IP_SALT: _unused, ...withoutSalt } = TEST_ENV;
    const response = await post(SHARE, { 'cf-connecting-ip': '203.0.113.7' }, { ...withoutSalt, DB: db });
    expect(response.status).toBe(500);
  });
});
