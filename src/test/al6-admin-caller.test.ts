import { describe, it, expect } from 'vitest';
import { isAdminCaller } from '../../functions/_lib/admin';
import { TEST_ENV, signTestToken } from './api-server';

function request(headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/articles/un-dernier-ete', { headers });
}

/**
 * `isAdminCaller` is the soft signal that keeps the editor's own preview
 * reads off the public view count — unlike `requireAdmin`, nothing here may
 * ever reject the request, so every case below asserts a boolean, not a
 * response.
 */
describe('AL-6 isAdminCaller', () => {
  it('recognises the editor’s own valid token', async () => {
    const token = await signTestToken();
    expect(await isAdminCaller(request({ authorization: `Bearer ${token}` }), TEST_ENV)).toBe(true);
  });

  it('is false with no Authorization header — the ordinary anonymous visitor', async () => {
    expect(await isAdminCaller(request(), TEST_ENV)).toBe(false);
  });

  it('is false for a malformed header, an expired token, and a token for another username', async () => {
    expect(await isAdminCaller(request({ authorization: 'Bearer' }), TEST_ENV)).toBe(false);
    expect(await isAdminCaller(request({ authorization: 'not-a-bearer-token' }), TEST_ENV)).toBe(false);

    const expired = await signTestToken(undefined, -1000);
    expect(await isAdminCaller(request({ authorization: `Bearer ${expired}` }), TEST_ENV)).toBe(false);

    const otherUser = await signTestToken('quelquun-dautre');
    expect(await isAdminCaller(request({ authorization: `Bearer ${otherUser}` }), TEST_ENV)).toBe(false);
  });

  it('is false, not thrown, on a misconfigured deployment', async () => {
    const token = await signTestToken();
    const { JWT_SECRET: _unused, ...broken } = TEST_ENV;
    // The public route this guards must still answer for a reader even if the
    // admin secrets are missing — only requireAdmin's own routes fail closed.
    expect(await isAdminCaller(request({ authorization: `Bearer ${token}` }), broken as typeof TEST_ENV)).toBe(
      false,
    );
  });
});
