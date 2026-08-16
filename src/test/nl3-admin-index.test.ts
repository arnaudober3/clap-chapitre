/**
 * GET /api/admin/newsletter, called directly.
 *
 * The one figure worth getting precisely right is `stats.monthDelta`: a net
 * count over the trailing 30 days (gained minus lost), not a percentage —
 * `deltaPct` answers a different question. Seeded with subscribers on both
 * sides of the 30-day boundary so the number is a known quantity, not
 * whatever the fixture happened to contain.
 */
import { describe, it, expect } from 'vitest';
import { onRequestGet as adminNewsletter } from '../../functions/api/admin/newsletter/index';
import { createTestDb } from './d1';
import { SEED } from './fixtures';
import { signTestToken, TEST_ENV } from './api-server';
import type { Env } from '../../functions/types';

async function env(sql = ''): Promise<Env> {
  const db = createTestDb();
  if (sql) await db.exec(sql);
  return { ...TEST_ENV, DB: db };
}

async function get(theEnv: Env) {
  return adminNewsletter({
    request: new Request('http://localhost/api/admin/newsletter', {
      headers: { Authorization: `Bearer ${await signTestToken()}` },
    }),
    env: theEnv,
  });
}

describe('NL-3 the admin gate', () => {
  it('refuses an anonymous caller', async () => {
    const response = await adminNewsletter({
      request: new Request('http://localhost/api/admin/newsletter'),
      env: await env(),
    });
    expect(response.status).toBe(401);
  });
});

describe('NL-3 the growth figure', () => {
  it('counts gained minus lost over the trailing 30 days, net', async () => {
    const SUBSCRIBERS = `
      -- Two gained this window, one lost this window: net +1.
      INSERT INTO newsletter_subscribers (email, status, subscribed_at, unsubscribed_at, unsubscribe_token) VALUES
        ('a@exemple.fr', 'subscribed', datetime('now', '-5 days'), NULL, 'tok-a'),
        ('b@exemple.fr', 'subscribed', datetime('now', '-10 days'), NULL, 'tok-b'),
        ('c@exemple.fr', 'unsubscribed', datetime('now', '-60 days'), datetime('now', '-3 days'), 'tok-c'),
        -- Outside the window on both sides: does not move the delta.
        ('d@exemple.fr', 'subscribed', datetime('now', '-45 days'), NULL, 'tok-d');
    `;
    const response = await get(await env(SUBSCRIBERS));
    expect(response.status).toBe(200);
    const payload = await response.json();
    // total = subscribed rows only: a, b, d (c is unsubscribed).
    expect(payload.stats.total).toBe(3);
    // gained (subscribed_at in window) = a, b → 2. lost (unsubscribed_at in window) = c → 1. net = 1.
    expect(payload.stats.monthDelta).toBe(1);
  });

  it('reports a negative delta honestly when unsubscribes outpace new subscribers', async () => {
    const SUBSCRIBERS = `
      INSERT INTO newsletter_subscribers (email, status, subscribed_at, unsubscribed_at, unsubscribe_token) VALUES
        ('a@exemple.fr', 'unsubscribed', datetime('now', '-40 days'), datetime('now', '-1 days'), 'tok-a'),
        ('b@exemple.fr', 'unsubscribed', datetime('now', '-40 days'), datetime('now', '-2 days'), 'tok-b'),
        ('c@exemple.fr', 'subscribed', datetime('now', '-3 days'), NULL, 'tok-c');
    `;
    const response = await get(await env(SUBSCRIBERS));
    const payload = await response.json();
    expect(payload.stats.monthDelta).toBe(-1); // 1 gained, 2 lost
  });

  it('is zero on an empty table', async () => {
    const response = await get(await env());
    const payload = await response.json();
    expect(payload.stats).toEqual({ total: 0, monthDelta: 0 });
  });
});

describe('NL-3 sends and scheduled', () => {
  it('lists sent editions newest first, and separately what is booked', async () => {
    const DATA = `${SEED}
      INSERT INTO newsletter_sends (id, bilan_id, subject, title, status, sent_at, scheduled_at, recipient_count, failure_count) VALUES
        ('a', '2026-07', 'Sujet A', 'Titre A', 'sent', '2026-07-01 09:00:00', NULL, 100, 1),
        ('b', '2026-06', 'Sujet B', 'Titre B', 'scheduled', NULL, '2026-12-01 09:00:00', 0, 0);
    `;
    const response = await get(await env(DATA));
    const payload = await response.json();
    expect(payload.sends).toHaveLength(1);
    expect(payload.sends[0]).toMatchObject({
      id: 'a',
      bilanId: '2026-07',
      title: 'Titre A',
      recipientCount: 100,
      failureCount: 1,
    });
    expect(payload.scheduled).toEqual([
      { bilanId: '2026-06', subject: 'Sujet B', scheduledAt: '2026-12-01 09:00:00' },
    ]);
  });
});
