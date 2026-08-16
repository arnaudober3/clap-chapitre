/**
 * POST /api/newsletter/unsubscribe, called directly.
 *
 * No honeypot, no timing window, no rate limit — the token itself is the
 * unguessable credential, so there is nothing here for a script to gain by
 * hammering the endpoint.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as unsubscribeRoute } from '../../functions/api/newsletter/unsubscribe';
import { createTestDb } from './d1';
import { TEST_ENV } from './api-server';
import type { D1Database } from '../../functions/types';

let db: D1Database & { close(): void };

const TOKEN = 'a'.repeat(64);

beforeEach(async () => {
  db = createTestDb();
  await db.exec(
    `INSERT INTO newsletter_subscribers (email, status, subscribed_at, unsubscribe_token)
     VALUES ('lecteur@exemple.fr', 'subscribed', datetime('now'), '${TOKEN}');`,
  );
});

function post(token: unknown, env = { ...TEST_ENV, DB: db }) {
  return unsubscribeRoute({
    request: new Request('http://localhost/api/newsletter/unsubscribe', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token }),
    }),
    env,
  });
}

async function status() {
  return (
    await db
      .prepare('SELECT status, unsubscribed_at FROM newsletter_subscribers WHERE email = ?')
      .bind('lecteur@exemple.fr')
      .first<{ status: string; unsubscribed_at: string | null }>()
  );
}

describe('NL-2 unsubscribing', () => {
  it('flips the row and answers 200', async () => {
    const response = await post(TOKEN);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ unsubscribed: true });

    const row = await status();
    expect(row?.status).toBe('unsubscribed');
    expect(row?.unsubscribed_at).not.toBeNull();
  });

  it('404s an unknown token', async () => {
    const response = await post('b'.repeat(64));
    expect(response.status).toBe(404);
    expect((await status())?.status).toBe('subscribed');
  });

  it('is idempotent — a second click is still a 200, and keeps the first timestamp', async () => {
    await post(TOKEN);
    const first = await status();

    const response = await post(TOKEN);
    expect(response.status).toBe(200);
    expect((await status())?.unsubscribed_at).toBe(first?.unsubscribed_at);
  });

  it('422s a missing or malformed token', async () => {
    const response = await post(undefined);
    expect(response.status).toBe(422);
  });
});
