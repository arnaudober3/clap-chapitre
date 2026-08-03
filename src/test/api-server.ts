/**
 * Routes `fetch` to the real Cloudflare Functions, in-process.
 *
 * No `vi.mock` anywhere in the suite: the client code under test runs against
 * the actual handlers, JSON serialisation and HTTP status codes included. The
 * only thing simulated is the wire between them — and, since the content moved
 * into D1, the database, which is a real SQLite one (`./d1.ts`) carrying the
 * project's own migrations. So a page test exercises the component, the hook,
 * the handler and the SQL, and a query that stops matching its schema fails
 * here rather than in production.
 */
import { onRequest as loginRoute } from '../../functions/api/login';
import { onRequest as verifyRoute } from '../../functions/api/verify';
import { onRequest as feedRoute } from '../../functions/api/feed';
import { onRequest as articlesRoute } from '../../functions/api/articles/index';
import { onRequest as articleRoute } from '../../functions/api/articles/[id]';
import { onRequest as bilansRoute } from '../../functions/api/bilans/index';
import { onRequest as bilanRoute } from '../../functions/api/bilans/[id]';
import { onRequest as aproposRoute } from '../../functions/api/pages/apropos';
import { onRequest as meSuivreRoute } from '../../functions/api/pages/me-suivre';
import { onRequest as adminDashboardRoute } from '../../functions/api/admin/dashboard';
import { onRequest as adminArticlesRoute } from '../../functions/api/admin/articles/index';
import { onRequest as adminArticleRoute } from '../../functions/api/admin/articles/[id]';
import { onRequest as adminBilansRoute } from '../../functions/api/admin/bilans/index';
import { onRequest as adminBilanRoute } from '../../functions/api/admin/bilans/[id]';
import { sha256Hex } from '../../functions/_lib/crypto';
import { signToken, TOKEN_TTL_MS } from '../../functions/_lib/jwt';
import type { D1Database, Env, Handler } from '../../functions/types';
import { matchRoute, type RoutePattern } from '../../vite/routeMatch';
import { createTestDb } from './d1';
import { TEST_JWT_SECRET, TEST_PASSWORD, TEST_USERNAME } from './credentials';

export const TEST_ENV: Env = {
  ADMIN_USERNAME: TEST_USERNAME,
  ADMIN_PASSWORD_HASH: await sha256Hex(TEST_PASSWORD),
  JWT_SECRET: TEST_JWT_SECRET,
  // Without this, every wrong-password assertion would wait 250ms and crowd
  // the default timeout of `findByRole('alert')`.
  LOGIN_THROTTLE_MS: '0',
};

/**
 * The database the stubbed `fetch` serves from. Absent until a test asks for
 * one — most of the suite has no content to speak of, and the auth tests must
 * keep running without a database at all, which is what proves `requireDb`
 * fails closed.
 */
let database: (D1Database & { close(): void }) | undefined;

/**
 * Start a fresh database for the current test and fill it with `sql`.
 *
 * Per test rather than per file: one test inserting a draft must not change what
 * the next one counts.
 */
export function useTestDb(sql?: string): D1Database {
  database?.close();
  database = createTestDb();
  if (sql) database.exec(sql);
  return database;
}

/** Drop the database. Called from the global `afterEach`. */
export function resetTestDb(): void {
  database?.close();
  database = undefined;
}

/**
 * Ordered like `vite/devApiPlugin.ts`, and matched by the same function, so a
 * route that works under vitest works under `npm run dev` — and vice versa.
 */
const ROUTES: ReadonlyArray<RoutePattern<Handler>> = [
  { pattern: '/api/login', target: loginRoute },
  { pattern: '/api/verify', target: verifyRoute },

  { pattern: '/api/feed', target: feedRoute },
  { pattern: '/api/articles', target: articlesRoute },
  { pattern: '/api/articles/:id', target: articleRoute },
  { pattern: '/api/bilans', target: bilansRoute },
  { pattern: '/api/bilans/:id', target: bilanRoute },
  { pattern: '/api/pages/apropos', target: aproposRoute },
  { pattern: '/api/pages/me-suivre', target: meSuivreRoute },

  { pattern: '/api/admin/dashboard', target: adminDashboardRoute },
  { pattern: '/api/admin/articles', target: adminArticlesRoute },
  { pattern: '/api/admin/articles/:id', target: adminArticleRoute },
  { pattern: '/api/admin/bilans', target: adminBilansRoute },
  { pattern: '/api/admin/bilans/:id', target: adminBilanRoute },
];

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
    const route = matchRoute(new URL(request.url).pathname, ROUTES);
    // Throwing is what a real fetch does for an unreachable host — which both
    // exercises the offline branch and guarantees no test reaches the network.
    if (!route) throw new TypeError(`Route non stubée : ${request.url}`);
    return route.target({
      request,
      // A test that never called `useTestDb` gets an env without `DB`, and the
      // content endpoints answer 500 — which is the honest outcome, and the same
      // one a deployment with no binding would give.
      env: database ? { ...TEST_ENV, DB: database } : TEST_ENV,
      params: route.params,
    });
  };
}
