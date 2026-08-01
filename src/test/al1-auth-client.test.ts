import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  TOKEN_KEY,
  login,
  logout,
  checkAuth,
  getToken,
  readStoredSession,
} from '../auth/auth';
import { decodeToken, isTokenValid } from '../auth/token';
import { installApiStub, signTestToken } from './api-server';
import { TEST_USERNAME as ADMIN_USERNAME, TEST_PASSWORD as PASSWORD } from './credentials';

describe('AL-1 token reading', () => {
  it('reads the subject and expiry out of a signed token', async () => {
    const token = await signTestToken();
    expect(token.split('.')).toHaveLength(3);
    const claims = decodeToken(token);
    expect(claims?.sub).toBe(ADMIN_USERNAME);
    expect((claims?.exp ?? 0) * 1000).toBeGreaterThan(Date.now());
  });

  it('rejects malformed tokens instead of throwing', async () => {
    expect(decodeToken(null)).toBeNull();
    expect(decodeToken('')).toBeNull();
    expect(decodeToken('pas-un-jeton')).toBeNull();
    expect(decodeToken('a.b.c')).toBeNull();
    // Two segments: a signature stripped off is not a token.
    const [header, payload] = (await signTestToken()).split('.');
    expect(decodeToken(`${header}.${payload}`)).toBeNull();
  });

  it('treats an expired token as invalid without rejecting its shape', async () => {
    const expired = await signTestToken(ADMIN_USERNAME, -1000);
    expect(decodeToken(expired)).not.toBeNull();
    expect(isTokenValid(expired)).toBe(false);
  });
});

describe('AL-1 auth client', () => {
  beforeEach(() => {
    window.localStorage.removeItem(TOKEN_KEY);
  });

  it('persists the token on a successful sign-in and drops it on sign-out', async () => {
    const result = await login(ADMIN_USERNAME, PASSWORD);
    expect(result).toMatchObject({ ok: true, user: { username: ADMIN_USERNAME } });
    expect(getToken()).not.toBeNull();
    expect(readStoredSession()).toEqual({ username: ADMIN_USERNAME });

    logout();
    expect(getToken()).toBeNull();
    expect(readStoredSession()).toBeNull();
  });

  it('reports the canonical username, not what was typed', async () => {
    // Same identity, typed sloppily — derived from the reference so the test
    // follows ADMIN_USERNAME instead of restating it.
    const typed = `  ${ADMIN_USERNAME.toUpperCase()}  `;
    expect(typed).not.toBe(ADMIN_USERNAME);

    const result = await login(typed, PASSWORD);
    expect(result).toMatchObject({ ok: true, user: { username: ADMIN_USERNAME } });
    expect(readStoredSession()).toEqual({ username: ADMIN_USERNAME });
  });

  it('stores nothing when the credentials are wrong', async () => {
    const result = await login(ADMIN_USERNAME, 'mauvais');
    expect(result).toEqual({ ok: false, error: 'Identifiants incorrects.' });
    expect(getToken()).toBeNull();
  });

  it('confirms a valid session against the server', async () => {
    window.localStorage.setItem(TOKEN_KEY, await signTestToken());
    expect(await checkAuth()).toEqual({ username: ADMIN_USERNAME });
    expect(getToken()).not.toBeNull();
  });

  it('purges an expired token when checking the session', async () => {
    window.localStorage.setItem(TOKEN_KEY, await signTestToken(ADMIN_USERNAME, -1000));
    expect(readStoredSession()).toBeNull();
    expect(await checkAuth()).toBeNull();
    expect(getToken()).toBeNull();
  });

  it('purges a token the server refuses, however well-formed', async () => {
    // Correct shape, unexpired, but signed with the wrong key — exactly what a
    // forged token looks like. The optimistic read lets it through; /api/verify
    // does not.
    const forged = await signTestToken('quelquun-dautre');
    window.localStorage.setItem(TOKEN_KEY, forged);
    expect(readStoredSession()).toEqual({ username: 'quelquun-dautre' });
    expect(await checkAuth()).toBeNull();
    expect(getToken()).toBeNull();
  });
});

describe('AL-1 auth client offline', () => {
  beforeEach(() => {
    // A fetch that throws is what an unreachable server looks like.
    globalThis.fetch = () => Promise.reject(new TypeError('Failed to fetch'));
  });

  afterEach(() => {
    installApiStub();
  });

  it('reports a network error rather than blaming the credentials', async () => {
    const result = await login(ADMIN_USERNAME, PASSWORD);
    expect(result).toMatchObject({ ok: false });
    if (result.ok) return;
    expect(result.error).not.toBe('Identifiants incorrects.');
    expect(result.error).toMatch(/injoignable/i);
    expect(getToken()).toBeNull();
  });

  it('keeps an unexpired session when the server cannot be reached', async () => {
    // Only a 401 signs the editor out; a broken network must not.
    const token = await signTestToken();
    window.localStorage.setItem(TOKEN_KEY, token);
    expect(await checkAuth()).toEqual({ username: ADMIN_USERNAME });
    expect(getToken()).toBe(token);
  });
});
