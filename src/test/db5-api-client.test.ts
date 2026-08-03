/**
 * The API client, and the one rule it must never get wrong.
 *
 * `src/auth/auth.ts` states it out loud: **only a 401 drops the token.** A
 * network failure or a 5xx keeps the optimistic session, because a
 * misconfigured deployment quietly signing the editor out on a loop, with no
 * message, is worse than a session that outlives its server by a few minutes.
 * Now that every admin panel goes through `apiGet`, that rule lives here too —
 * and a mistake would look like a back-office that logs the editor out whenever
 * the database hiccups.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiGet, ApiError, setUnauthorizedHandler } from '../api/client';
import { getToken, setToken, TOKEN_KEY } from '../auth/auth';

const realFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = realFetch;
  setUnauthorizedHandler(undefined);
  window.localStorage.clear();
});

/** Replace `fetch` for one test, and report how often it was called. */
function stubFetch(reply: () => Promise<Response> | Response) {
  const calls = { count: 0 };
  globalThis.fetch = async () => {
    calls.count += 1;
    return reply();
  };
  return calls;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('DB-5 apiGet', () => {
  it('parses a 200 into its payload', async () => {
    stubFetch(() => json({ items: [1, 2] }));
    await expect(apiGet<{ items: number[] }>('/api/feed')).resolves.toEqual({ items: [1, 2] });
  });

  it('drops the token on a 401, and tells the session about it', async () => {
    window.localStorage.setItem(TOKEN_KEY, 'un-jeton');
    const notified = vi.fn();
    setUnauthorizedHandler(notified);
    stubFetch(() => json({ error: 'Session invalide.' }, 401));

    await expect(apiGet('/api/admin/articles', { admin: true })).rejects.toBeInstanceOf(ApiError);
    expect(getToken()).toBeNull();
    expect(notified).toHaveBeenCalledOnce();
  });

  it('keeps the token on a 5xx — the server is broken, not the session', async () => {
    setToken('un-jeton');
    const notified = vi.fn();
    setUnauthorizedHandler(notified);
    stubFetch(() => json({ error: 'Base de données indisponible.' }, 503));

    const error = await apiGet('/api/admin/articles', { admin: true }).catch((cause) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).status).toBe(503);
    // The wording comes from the server when it sent one.
    expect((error as ApiError).message).toBe('Base de données indisponible.');
    expect(getToken()).toBe('un-jeton');
    expect(notified).not.toHaveBeenCalled();
  });

  it('keeps the token when fetch itself fails, and reports status 0', async () => {
    setToken('un-jeton');
    globalThis.fetch = async () => {
      throw new TypeError('Failed to fetch');
    };

    const error = (await apiGet('/api/feed').catch((cause) => cause)) as ApiError;
    // Zero is not a status a server can send, so it cannot be mistaken for one.
    expect(error.status).toBe(0);
    expect(error.message).toBe('Serveur injoignable. Réessaie dans un instant.');
    expect(getToken()).toBe('un-jeton');
  });

  it('marks a 404 as such, so a page can tell it from "not loaded yet"', async () => {
    stubFetch(() => json({ error: 'Introuvable.' }, 404));
    const error = (await apiGet('/api/articles/inconnu').catch((cause) => cause)) as ApiError;
    expect(error.isNotFound).toBe(true);
  });

  it('sends the bearer token only when the call asks for it', async () => {
    setToken('un-jeton');
    const seen: Array<string | null> = [];
    globalThis.fetch = async (_input, init) => {
      seen.push(new Headers(init?.headers).get('Authorization'));
      return json({});
    };

    await apiGet('/api/feed');
    await apiGet('/api/admin/articles', { admin: true });
    expect(seen).toEqual([null, 'Bearer un-jeton']);
  });

  it('shares one in-flight request between simultaneous callers', async () => {
    // The header and the avis page mount in the same tick and want the same
    // avis; without this they would ask twice.
    let release: (() => void) | undefined;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    const calls = stubFetch(async () => {
      await gate;
      return json({ ok: true });
    });

    const first = apiGet('/api/articles/un-dernier-ete');
    const second = apiGet('/api/articles/un-dernier-ete');
    release!();
    await Promise.all([first, second]);
    expect(calls.count).toBe(1);

    // Nothing is cached: once settled, the next caller asks again.
    await apiGet('/api/articles/un-dernier-ete');
    expect(calls.count).toBe(2);
  });

  it('rethrows an abort untouched, so a caller can tell it apart', async () => {
    globalThis.fetch = async () => {
      throw new DOMException('Aborted', 'AbortError');
    };
    const controller = new AbortController();
    const error = await apiGet('/api/feed', { signal: controller.signal }).catch((cause) => cause);
    // Not an ApiError: an abort is the caller changing its mind, not a failure.
    expect(error).toBeInstanceOf(DOMException);
  });
});
