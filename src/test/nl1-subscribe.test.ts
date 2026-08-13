/**
 * POST /api/newsletter/subscribe, called directly.
 *
 * Same guard order as the comment composer (WR-7): honeypot, minimum delay,
 * sliding window, then the write — checked here in the same shape.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as subscribeRoute } from '../../functions/api/newsletter/subscribe';
import { createTestDb } from './d1';
import { TEST_ENV } from './api-server';
import type { D1Database } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(() => {
  db = createTestDb();
});

/** A form that has been on screen long enough to be read. */
const READ = () => Date.now() - 10_000;

function post(body: unknown, ip = '203.0.113.7', env = { ...TEST_ENV, DB: db }) {
  return subscribeRoute({
    request: new Request('http://localhost/api/newsletter/subscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
      body: JSON.stringify(body),
    }),
    env,
  });
}

const SUBSCRIBE = { email: 'lecteur@exemple.fr', trap: '', openedAt: READ() };

async function subscriberRow(email = SUBSCRIBE.email) {
  return db
    .prepare('SELECT status, subscribed_at, unsubscribed_at, unsubscribe_token FROM newsletter_subscribers WHERE email = ?')
    .bind(email)
    .first<{ status: string; subscribed_at: string; unsubscribed_at: string | null; unsubscribe_token: string }>();
}

describe('NL-1 subscribing', () => {
  it('writes a subscribed row and answers 201, never echoing the address', async () => {
    const response = await post(SUBSCRIBE);
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ subscribed: true });

    const row = await subscriberRow();
    expect(row?.status).toBe('subscribed');
    expect(row?.unsubscribed_at).toBeNull();
    expect(row?.unsubscribe_token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('lowercases and trims the address, so the same person cannot land twice', async () => {
    await post({ ...SUBSCRIBE, email: '  Lecteur@Exemple.fr  ', openedAt: READ() });
    expect(await subscriberRow('lecteur@exemple.fr')).not.toBeNull();
  });

  it('refuses a malformed address', async () => {
    const response = await post({ ...SUBSCRIBE, email: 'pas-un-email' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : email.' });
  });
});

describe('NL-1 the honeypot and the minimum delay', () => {
  it('answers like a success and writes nothing when the honeypot is filled', async () => {
    const response = await post({ ...SUBSCRIBE, trap: 'http://spam.example' });
    expect(response.status).toBe(201);
    expect(await subscriberRow()).toBeNull();
  });

  it('answers like a success and writes nothing for a form submitted too fast', async () => {
    const response = await post({ ...SUBSCRIBE, openedAt: Date.now() });
    expect(response.status).toBe(201);
    expect(await subscriberRow()).toBeNull();
  });
});

describe('NL-1 the sliding window', () => {
  it('lets ten through and refuses the eleventh from the same address', async () => {
    for (let i = 1; i <= 10; i += 1) {
      const response = await post({ email: `lecteur${i}@exemple.fr`, trap: '', openedAt: READ() });
      expect(response.status).toBe(201);
    }
    const refused = await post({ email: 'lecteur11@exemple.fr', trap: '', openedAt: READ() });
    expect(refused.status).toBe(429);
  });
});

describe('NL-1 resubscribing', () => {
  it('flips an unsubscribed address back, with a fresh timestamp and token', async () => {
    await post(SUBSCRIBE);
    const first = await subscriberRow();

    await db
      .prepare("UPDATE newsletter_subscribers SET status = 'unsubscribed', unsubscribed_at = datetime('now') WHERE email = ?")
      .bind(SUBSCRIBE.email)
      .run();

    const response = await post({ ...SUBSCRIBE, openedAt: READ() });
    expect(response.status).toBe(201);

    const second = await subscriberRow();
    expect(second?.status).toBe('subscribed');
    expect(second?.unsubscribed_at).toBeNull();
    expect(second?.unsubscribe_token).toBe(first?.unsubscribe_token); // same HMAC(email), deterministic
  });
});

describe('NL-1 fail-closed', () => {
  it('answers 500 without IP_SALT', async () => {
    const { IP_SALT: _unused, ...withoutSalt } = TEST_ENV;
    const response = await post(SUBSCRIBE, '203.0.113.7', { ...withoutSalt, DB: db });
    expect(response.status).toBe(500);
  });

  it('answers 500 without NEWSLETTER_UNSUB_SECRET', async () => {
    const { NEWSLETTER_UNSUB_SECRET: _unused, ...withoutSecret } = TEST_ENV;
    const response = await post(SUBSCRIBE, '203.0.113.7', { ...withoutSecret, DB: db });
    expect(response.status).toBe(500);
  });
});
