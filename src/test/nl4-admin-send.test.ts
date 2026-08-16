/**
 * The admin send/test/schedule/dispatch routes, called directly.
 *
 * `_lib/email.ts` calls Resend for real inside these handlers — over the same
 * `fetch` the suite's `installApiStub` already owns, which stubs
 * `api.resend.com` too (see `setResendOutcome`). No real network is ever
 * reached.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { onRequest as sendRoute } from '../../functions/api/admin/newsletter/send/[bilanId]';
import { onRequest as testRoute } from '../../functions/api/admin/newsletter/test/[bilanId]';
import { onRequest as scheduleRoute } from '../../functions/api/admin/newsletter/schedule/[bilanId]';
import { onRequest as dispatchRoute } from '../../functions/api/admin/newsletter/dispatch';
import { createTestDb } from './d1';
import { SEED } from './fixtures';
import { signTestToken, TEST_ENV, setResendOutcome } from './api-server';
import type { D1Database, Env, Handler } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(() => {
  db = createTestDb();
  db.exec(`${SEED}
    INSERT INTO newsletter_subscribers (email, status, subscribed_at, unsubscribe_token) VALUES
      ('a@exemple.fr', 'subscribed', datetime('now'), 'tok-a'),
      ('b@exemple.fr', 'subscribed', datetime('now'), 'tok-b');
  `);
});

afterEach(() => {
  setResendOutcome('ok');
});

function env(): Env {
  return { ...TEST_ENV, DB: db };
}

async function admin(
  route: Handler,
  bilanId: string,
  method: 'POST' | 'DELETE',
  body?: unknown,
) {
  return route({
    request: new Request(`http://localhost/api/admin/newsletter/x/${bilanId}`, {
      method,
      headers: {
        Authorization: `Bearer ${await signTestToken()}`,
        ...(body ? { 'content-type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    }),
    env: env(),
    params: { bilanId },
  });
}

describe('NL-4 sending now', () => {
  it('sends to every subscriber and logs the send', async () => {
    const response = await admin(sendRoute, '2026-07', 'POST', { subject: 'Le mois de juillet' });
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.recipientCount).toBe(2);
    expect(payload.failureCount).toBe(0);

    const row = await db
      .prepare("SELECT status, sent_at, recipient_count FROM newsletter_sends WHERE bilan_id = '2026-07'")
      .first<{ status: string; sent_at: string; recipient_count: number }>();
    expect(row?.status).toBe('sent');
    expect(row?.sent_at).not.toBeNull();
    expect(row?.recipient_count).toBe(2);
  });

  it('404s an unknown or unpublished bilan', async () => {
    expect((await admin(sendRoute, 'fantôme', 'POST', { subject: 'X' })).status).toBe(404);
    expect((await admin(sendRoute, 'contre-champs', 'POST', { subject: 'X' })).status).toBe(404);
  });

  it('refuses a second send of the same bilan', async () => {
    await admin(sendRoute, '2026-07', 'POST', { subject: 'Une première fois' });
    const second = await admin(sendRoute, '2026-07', 'POST', { subject: 'Encore ?' });
    expect(second.status).toBe(409);
  });

  it('counts a Resend failure without refusing the request', async () => {
    setResendOutcome('fail');
    const response = await admin(sendRoute, '2026-07', 'POST', { subject: 'Le mois de juillet' });
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.recipientCount).toBe(0);
    expect(payload.failureCount).toBe(2);
  });

  it('clears a pending schedule for the same bilan on send', async () => {
    await admin(scheduleRoute, '2026-07', 'POST', { subject: 'X', date: '2030-01-01', time: '09:00' });
    await admin(sendRoute, '2026-07', 'POST', { subject: 'X' });
    const scheduled = await db
      .prepare("SELECT count(*) AS n FROM newsletter_sends WHERE bilan_id = '2026-07' AND status = 'scheduled'")
      .first<{ n: number }>();
    expect(scheduled?.n).toBe(0);
  });
});

describe('NL-4 sending a test', () => {
  it('sends one message and writes nothing to newsletter_sends', async () => {
    const response = await admin(testRoute, '2026-07', 'POST', {
      subject: 'Aperçu',
      email: 'relecture@exemple.fr',
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ sent: true });

    const count = await db.prepare('SELECT count(*) AS n FROM newsletter_sends').first<{ n: number }>();
    expect(count?.n).toBe(0);
  });

  it('502s when Resend refuses the test', async () => {
    setResendOutcome('fail');
    const response = await admin(testRoute, '2026-07', 'POST', {
      subject: 'Aperçu',
      email: 'relecture@exemple.fr',
    });
    expect(response.status).toBe(502);
  });
});

describe('NL-4 scheduling', () => {
  it('books a future send and rejects a past one', async () => {
    const ok = await admin(scheduleRoute, '2026-07', 'POST', {
      subject: 'X',
      date: '2030-01-01',
      time: '09:00',
    });
    expect(ok.status).toBe(201);

    const past = await admin(scheduleRoute, '2026-07', 'POST', {
      subject: 'X',
      date: '2020-01-01',
      time: '09:00',
    });
    expect(past.status).toBe(422);
  });

  it('re-booking the same bilan updates the one row rather than inserting a second', async () => {
    await admin(scheduleRoute, '2026-07', 'POST', { subject: 'Première', date: '2030-01-01', time: '09:00' });
    await admin(scheduleRoute, '2026-07', 'POST', { subject: 'Seconde', date: '2030-02-01', time: '10:00' });

    const rows = await db
      .prepare("SELECT subject FROM newsletter_sends WHERE bilan_id = '2026-07' AND status = 'scheduled'")
      .all<{ subject: string }>();
    expect(rows.results).toHaveLength(1);
    expect(rows.results[0].subject).toBe('Seconde');
  });

  it('cancels a booking, 404s a bilan with none', async () => {
    await admin(scheduleRoute, '2026-07', 'POST', { subject: 'X', date: '2030-01-01', time: '09:00' });
    expect((await admin(scheduleRoute, '2026-07', 'DELETE')).status).toBe(204);
    expect((await admin(scheduleRoute, '2026-07', 'DELETE')).status).toBe(404);
  });

  it('refuses to schedule an edition already sent', async () => {
    await admin(sendRoute, '2026-07', 'POST', { subject: 'X' });
    const response = await admin(scheduleRoute, '2026-07', 'POST', {
      subject: 'Encore ?',
      date: '2030-01-01',
      time: '09:00',
    });
    expect(response.status).toBe(409);
  });
});

describe('NL-4 dispatch', () => {
  function dispatch(secret: string | undefined) {
    return dispatchRoute({
      request: new Request('http://localhost/api/admin/newsletter/dispatch', {
        method: 'POST',
        headers: secret ? { 'x-cron-secret': secret } : {},
      }),
      env: env(),
    });
  }

  it('refuses without the cron secret, and with the wrong one', async () => {
    expect((await dispatch(undefined)).status).toBe(401);
    expect((await dispatch('pas-le-bon-secret-du-tout')).status).toBe(401);
  });

  it('fires a due scheduled send and marks it sent', async () => {
    db.exec(
      `INSERT INTO newsletter_sends (id, bilan_id, subject, title, status, scheduled_at)
       VALUES ('due', '2026-07', 'Le mois de juillet', 'Les longues soirées', 'scheduled', datetime('now', '-1 minutes'));`,
    );

    const response = await dispatch(TEST_ENV.CRON_SECRET);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ dispatched: 1, failed: 0 });

    const row = await db
      .prepare("SELECT status, recipient_count FROM newsletter_sends WHERE id = 'due'")
      .first<{ status: string; recipient_count: number }>();
    expect(row?.status).toBe('sent');
    expect(row?.recipient_count).toBe(2);
  });

  it('leaves a not-yet-due schedule alone', async () => {
    db.exec(
      `INSERT INTO newsletter_sends (id, bilan_id, subject, title, status, scheduled_at)
       VALUES ('later', '2026-07', 'Plus tard', 'Les longues soirées', 'scheduled', '2030-01-01 09:00:00');`,
    );
    const response = await dispatch(TEST_ENV.CRON_SECRET);
    expect(await response.json()).toEqual({ dispatched: 0, failed: 0 });
    expect(
      (await db.prepare("SELECT status FROM newsletter_sends WHERE id = 'later'").first<{ status: string }>())
        ?.status,
    ).toBe('scheduled');
  });

  it('marks a send failed when its bilan is no longer published', async () => {
    db.exec(
      `UPDATE bilans SET status = 'draft', published_at = NULL WHERE id = '2026-07';
       INSERT INTO newsletter_sends (id, bilan_id, subject, title, status, scheduled_at)
       VALUES ('orphan', '2026-07', 'X', 'Les longues soirées', 'scheduled', datetime('now', '-1 minutes'));`,
    );
    const response = await dispatch(TEST_ENV.CRON_SECRET);
    expect(await response.json()).toEqual({ dispatched: 0, failed: 1 });
    expect(
      (await db.prepare("SELECT status FROM newsletter_sends WHERE id = 'orphan'").first<{ status: string }>())
        ?.status,
    ).toBe('failed');
  });
});
