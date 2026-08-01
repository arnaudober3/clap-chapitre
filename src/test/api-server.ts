/**
 * Routes `fetch` to the real Cloudflare Functions, in-process.
 *
 * No `vi.mock` anywhere in the suite: the client code under test runs against
 * the actual handlers, JSON serialisation and HTTP status codes included. The
 * only thing simulated is the wire between them.
 */
import { onRequest as loginRoute } from '../../functions/api/login';
import { onRequest as verifyRoute } from '../../functions/api/verify';
import { sha256Hex } from '../../functions/_lib/crypto';
import { signToken, TOKEN_TTL_MS } from '../../functions/_lib/jwt';
import type { Env, Handler } from '../../functions/types';
import { TEST_JWT_SECRET, TEST_PASSWORD, TEST_USERNAME } from './credentials';

export const TEST_ENV: Env = {
  ADMIN_USERNAME: TEST_USERNAME,
  ADMIN_PASSWORD_HASH: await sha256Hex(TEST_PASSWORD),
  JWT_SECRET: TEST_JWT_SECRET,
  // Without this, every wrong-password assertion would wait 250ms and crowd
  // the default timeout of `findByRole('alert')`.
  LOGIN_THROTTLE_MS: '0',
};

const ROUTES: Record<string, Handler> = {
  '/api/login': loginRoute,
  '/api/verify': verifyRoute,
};

/**
 * A token signed with the test secret. A negative `ttlMs` yields an expired
 * one — the replacement for the mock era's `issueMockToken(user, -1000)`.
 */
export function signTestToken(
  username: string = TEST_USERNAME,
  ttlMs: number = TOKEN_TTL_MS,
): Promise<string> {
  return signToken(username, TEST_JWT_SECRET, ttlMs);
}

export function installApiStub(): void {
  globalThis.fetch = async (input, init) => {
    const request = new Request(new URL(String(input), 'http://localhost'), init);
    const route = ROUTES[new URL(request.url).pathname];
    // Throwing is what a real fetch does for an unreachable host — which both
    // exercises the offline branch and guarantees no test reaches the network.
    if (!route) throw new TypeError(`Route non stubée : ${request.url}`);
    return route({ request, env: TEST_ENV });
  };
}
