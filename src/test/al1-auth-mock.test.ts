import { describe, it, expect, beforeEach } from 'vitest';
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD_HASH,
  sha256Hex,
  issueMockToken,
  decodeToken,
  isTokenValid,
  mockLogin,
  mockVerify,
} from '../mock/auth';
import {
  TOKEN_KEY,
  login,
  logout,
  checkAuth,
  getToken,
  readStoredSession,
} from '../auth/auth';
import { TEST_PASSWORD as PASSWORD } from './credentials';

describe('AL-1 auth mock', () => {
  it('hashes with SHA-256 and matches the stored reference hash', async () => {
    expect(await sha256Hex(PASSWORD)).toBe(ADMIN_PASSWORD_HASH);
    expect(await sha256Hex('')).toHaveLength(64);
    expect(await sha256Hex('autre')).not.toBe(ADMIN_PASSWORD_HASH);
  });

  it('issues a three-segment token carrying the subject and an expiry', () => {
    const token = issueMockToken(ADMIN_USERNAME);
    expect(token.split('.')).toHaveLength(3);
    const claims = decodeToken(token);
    expect(claims?.sub).toBe(ADMIN_USERNAME);
    expect((claims?.exp ?? 0) * 1000).toBeGreaterThan(Date.now());
  });

  it('rejects malformed tokens instead of throwing', () => {
    expect(decodeToken(null)).toBeNull();
    expect(decodeToken('')).toBeNull();
    expect(decodeToken('pas-un-jeton')).toBeNull();
    expect(decodeToken('a.b.c')).toBeNull();
    expect(decodeToken(issueMockToken(ADMIN_USERNAME).replace('.mock', ''))).toBeNull();
  });

  it('treats an expired token as invalid', async () => {
    const expired = issueMockToken(ADMIN_USERNAME, -1000);
    expect(decodeToken(expired)).not.toBeNull();
    expect(isTokenValid(expired)).toBe(false);
    const response = await mockVerify(expired);
    expect(response.ok).toBe(false);
  });

  it('signs in only with the right username and password', async () => {
    const good = await mockLogin({ username: ADMIN_USERNAME, password: PASSWORD });
    expect(good.ok).toBe(true);

    const wrongPassword = await mockLogin({
      username: ADMIN_USERNAME,
      password: 'nope',
    });
    expect(wrongPassword).toMatchObject({ ok: false, status: 401 });

    const wrongUser = await mockLogin({ username: 'jean', password: PASSWORD });
    expect(wrongUser.ok).toBe(false);
  });

  it('verifies a freshly issued token', async () => {
    const issued = await mockLogin({ username: ADMIN_USERNAME, password: PASSWORD });
    expect(issued.ok).toBe(true);
    if (!issued.ok) return;
    const verified = await mockVerify(issued.data.token);
    expect(verified).toMatchObject({ ok: true, data: { username: ADMIN_USERNAME } });
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

  it('purges an expired token when checking the session', async () => {
    window.localStorage.setItem(TOKEN_KEY, issueMockToken(ADMIN_USERNAME, -1000));
    expect(readStoredSession()).toBeNull();
    expect(await checkAuth()).toBeNull();
    expect(getToken()).toBeNull();
  });
});
