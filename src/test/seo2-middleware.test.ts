/**
 * `functions/_middleware.ts`, called directly with a stubbed `next()` sentinel
 * standing in for Pages' own dispatch chain (the real chain is only exercised
 * by `npm run preview:cf`, per the module's own doc comment).
 */
import { describe, expect, it } from 'vitest';
import { createTestDb } from './d1';
import { SEED } from './fixtures';
import { TEST_ENV } from './api-server';
import { onRequest as middleware } from '../../functions/_middleware';
import type { Env, FunctionContext } from '../../functions/types';

function env(sql = SEED): Env {
  const db = createTestDb();
  if (sql) db.exec(sql);
  return { ...TEST_ENV, DB: db };
}

const SENTINEL = new Response('spa-fallback');

function context(path: string, userAgent: string, envValue: Env = env()): FunctionContext {
  return {
    request: new Request(`http://localhost${path}`, {
      headers: userAgent ? { 'user-agent': userAgent } : {},
    }),
    env: envValue,
    next: async () => SENTINEL,
  };
}

describe('SEO-2 bot-prerendering middleware', () => {
  it('falls through to the SPA for a normal browser or for Googlebot', async () => {
    const browser = await middleware(context('/article/un-dernier-ete', 'Mozilla/5.0'));
    const googlebot = await middleware(
      context('/article/un-dernier-ete', 'Mozilla/5.0 (compatible; Googlebot/2.1)'),
    );
    expect(browser).toBe(SENTINEL);
    expect(googlebot).toBe(SENTINEL);
  });

  it('serves a real-tag HTML shell to a known social crawler on an avis', async () => {
    const response = await middleware(context('/article/un-dernier-ete', 'facebookexternalhit/1.1'));
    expect(response).not.toBe(SENTINEL);
    expect(response.headers.get('content-type')).toBe('text/html; charset=utf-8');

    const body = await response.text();
    expect(body).toContain('<title>Un dernier été · Clap et chapitre</title>');
    expect(body).toContain(
      'Un huis clos solaire où chaque silence pèse plus lourd que les mots.',
    );
    // The seed's cover is '' — omitted, not a placeholder.
    expect(body).not.toContain('og:image');
  });

  it('serves the bilan for "latest" and for its own id alike', async () => {
    const latest = await middleware(context('/bilan-culturel', 'Twitterbot'));
    const byId = await middleware(context('/bilan-culturel?mois=2026-07', 'LinkedInBot'));

    expect(await latest.text()).toContain('Les longues soirées');
    expect(await byId.text()).toContain('Les longues soirées');
  });

  it('falls through for an unknown id', async () => {
    const response = await middleware(context('/article/inconnu', 'Slackbot'));
    expect(response).toBe(SENTINEL);
  });

  it('falls through outside the two covered routes, even for a known bot', async () => {
    const home = await middleware(context('/', 'facebookexternalhit/1.1'));
    const api = await middleware(context('/api/feed', 'facebookexternalhit/1.1'));
    expect(home).toBe(SENTINEL);
    expect(api).toBe(SENTINEL);
  });

  it('falls through rather than breaking the crawler when the DB binding is missing', async () => {
    const response = await middleware(
      context('/article/un-dernier-ete', 'facebookexternalhit/1.1', TEST_ENV),
    );
    expect(response).toBe(SENTINEL);
  });
});
