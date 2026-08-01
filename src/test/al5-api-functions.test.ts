/**
 * The Functions themselves, called directly — no fetch, no React, no DOM.
 * This is where the security properties of the gate are asserted.
 */
import { describe, it, expect } from 'vitest';
import { onRequest as login, onRequestPost as loginPost } from '../../functions/api/login';
import { onRequest as verify, onRequestPost as verifyPost } from '../../functions/api/verify';
import { signToken } from '../../functions/_lib/jwt';
import type { Env } from '../../functions/types';
import { TEST_ENV, signTestToken } from './api-server';
import { TEST_JWT_SECRET, TEST_PASSWORD, TEST_USERNAME } from './credentials';

function post(url: string, body: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${url}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

/**
 * Segments are base64url, not base64: `atob` alone would choke on a `-` or `_`,
 * which the payload can grow depending on the username and the current `iat`.
 */
function decodeSegment(segment: string): Record<string, unknown> {
  const padded = segment.replace(/-/g, '+').replace(/_/g, '/');
  return JSON.parse(atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, '=')));
}

function bearer(token: string) {
  return new Request('http://localhost/api/verify', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

/** A signed-in token, obtained the way the browser obtains one. */
async function issueToken(): Promise<string> {
  const response = await loginPost({
    request: post('/api/login', { username: TEST_USERNAME, password: TEST_PASSWORD }),
    env: TEST_ENV,
  });
  const { token } = (await response.json()) as { token: string };
  return token;
}

describe('AL-5 POST /api/login', () => {
  it('issues an HS256 token whose subject is the canonical username', async () => {
    const response = await loginPost({
      request: post('/api/login', { username: TEST_USERNAME, password: TEST_PASSWORD }),
      env: TEST_ENV,
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');

    const { token } = (await response.json()) as { token: string };
    const [header, payload] = token.split('.');
    expect(token.split('.')).toHaveLength(3);
    expect(decodeSegment(header).alg).toBe('HS256');
    expect(decodeSegment(payload).sub).toBe(TEST_USERNAME);
  });

  it('accepts a username typed with stray case and spacing', async () => {
    const response = await loginPost({
      request: post('/api/login', {
        username: `  ${TEST_USERNAME.toUpperCase()}  `,
        password: TEST_PASSWORD,
      }),
      env: TEST_ENV,
    });
    expect(response.status).toBe(200);
  });

  it('refuses a wrong password', async () => {
    const response = await loginPost({
      request: post('/api/login', { username: TEST_USERNAME, password: 'nope' }),
      env: TEST_ENV,
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Identifiants incorrects.' });
  });

  it('refuses an unknown username, with the same message', async () => {
    const response = await loginPost({
      request: post('/api/login', { username: 'jean', password: TEST_PASSWORD }),
      env: TEST_ENV,
    });
    expect(response.status).toBe(401);
    // Identical wording: the response must not reveal which half was wrong.
    expect(await response.json()).toEqual({ error: 'Identifiants incorrects.' });
  });

  it('rejects a malformed body without throwing', async () => {
    const response = await loginPost({
      request: post('/api/login', 'pas-du-json'),
      env: TEST_ENV,
    });
    expect(response.status).toBe(400);
  });

  it('rejects missing or non-string fields', async () => {
    for (const body of [{}, { username: TEST_USERNAME }, { username: 1, password: 2 }]) {
      const response = await loginPost({ request: post('/api/login', body), env: TEST_ENV });
      expect(response.status).toBe(400);
    }
  });

  it('answers 405 with an Allow header on anything but POST', async () => {
    const response = await login({
      request: new Request('http://localhost/api/login'),
      env: TEST_ENV,
    });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('fails closed — never open — when the environment is incomplete', async () => {
    const broken: Partial<Env>[] = [
      {},
      { ...TEST_ENV, JWT_SECRET: '' },
      { ...TEST_ENV, ADMIN_PASSWORD_HASH: 'trop-court' },
      { ...TEST_ENV, JWT_SECRET: 'court' },
    ];
    for (const env of broken) {
      const response = await loginPost({
        request: post('/api/login', { username: TEST_USERNAME, password: TEST_PASSWORD }),
        env: env as Env,
      });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: 'Configuration du serveur incomplète.',
      });
    }
  });
});

describe('AL-5 POST /api/verify', () => {
  it('accepts a freshly issued token', async () => {
    const response = await verifyPost({ request: bearer(await issueToken()), env: TEST_ENV });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ username: TEST_USERNAME });
  });

  it('refuses a missing or malformed Authorization header', async () => {
    const requests = [
      new Request('http://localhost/api/verify', { method: 'POST' }),
      new Request('http://localhost/api/verify', {
        method: 'POST',
        headers: { Authorization: 'Basic abc' },
      }),
      new Request('http://localhost/api/verify', {
        method: 'POST',
        headers: { Authorization: 'Bearer' },
      }),
    ];
    for (const request of requests) {
      const response = await verifyPost({ request, env: TEST_ENV });
      expect(response.status).toBe(401);
    }
  });

  it('refuses a tampered signature', async () => {
    const token = await issueToken();
    const tampered = `${token.slice(0, -1)}${token.endsWith('A') ? 'B' : 'A'}`;
    const response = await verifyPost({ request: bearer(tampered), env: TEST_ENV });
    expect(response.status).toBe(401);
  });

  it('refuses a token signed with a different secret', async () => {
    const foreign = await signToken(TEST_USERNAME, `${TEST_JWT_SECRET}-autre`);
    const response = await verifyPost({ request: bearer(foreign), env: TEST_ENV });
    expect(response.status).toBe(401);
  });

  it('refuses an expired token', async () => {
    const response = await verifyPost({
      request: bearer(await signTestToken(TEST_USERNAME, -1000)),
      env: TEST_ENV,
    });
    expect(response.status).toBe(401);
  });

  it("refuses an unsigned alg:'none' token — the DEV-28 mock shape", async () => {
    // Those tokens are still sitting in the localStorage of anyone who used the
    // prototype. Accepting one would mean the gate never became real.
    const encode = (value: unknown) =>
      btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const header = encode({ alg: 'none', typ: 'JWT' });
    const payload = encode({
      sub: TEST_USERNAME,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    });

    for (const forged of [`${header}.${payload}.mock`, `${header}.${payload}.`]) {
      const response = await verifyPost({ request: bearer(forged), env: TEST_ENV });
      expect(response.status).toBe(401);
    }
  });

  it('refuses a validly signed token issued for another subject', async () => {
    // Rotating ADMIN_USERNAME has to invalidate the previous editor's sessions.
    const response = await verifyPost({
      request: bearer(await signTestToken('ancien-editeur')),
      env: TEST_ENV,
    });
    expect(response.status).toBe(401);
  });

  it('answers 405 with an Allow header on anything but POST', async () => {
    const response = await verify({
      request: new Request('http://localhost/api/verify'),
      env: TEST_ENV,
    });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });

  it('fails closed when the environment is incomplete', async () => {
    const token = await issueToken();
    const response = await verifyPost({ request: bearer(token), env: {} as Env });
    expect(response.status).toBe(500);
  });
});
