/**
 * `/robots.txt` and `/sitemap.xml`, called directly against the real handlers
 * and a real seeded SQLite database — same pattern as `db3-content-endpoints.test.ts`.
 */
import { describe, expect, it } from 'vitest';
import { createTestDb } from './d1';
import { SEED } from './fixtures';
import { TEST_ENV } from './api-server';
import { onRequestGet as robots } from '../../functions/robots.txt';
import { onRequestGet as sitemap } from '../../functions/sitemap.xml';
import { SITE_URL } from '../../functions/_lib/site';
import type { Env } from '../../functions/types';

function env(sql = SEED): Env {
  const db = createTestDb();
  if (sql) db.exec(sql);
  return { ...TEST_ENV, DB: db };
}

function get(url: string): Request {
  return new Request(`http://localhost${url}`);
}

describe('SEO-1 /robots.txt', () => {
  it('disallows /admin and points at the sitemap', async () => {
    const response = await robots({ request: get('/robots.txt'), env: TEST_ENV });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('text/plain; charset=utf-8');

    const body = await response.text();
    expect(body).toContain('Disallow: /admin');
    expect(body).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});

describe('SEO-1 /sitemap.xml', () => {
  it('lists published avis and bilans with a lastmod, and every static route', async () => {
    const response = await sitemap({ request: get('/sitemap.xml'), env: env() });
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/xml; charset=utf-8');

    const body = await response.text();
    expect(body).toContain(`<loc>${SITE_URL}/article/un-dernier-ete</loc>`);
    expect(body).toContain('<lastmod>2026-07-18</lastmod>');
    expect(body).toContain(`<loc>${SITE_URL}/article/l-annee-de-la-pluie</loc>`);
    expect(body).toContain(`<loc>${SITE_URL}/bilan-culturel?mois=2026-07</loc>`);
    expect(body).toContain('<lastmod>2026-08-02</lastmod>');
    expect(body).toContain(`<loc>${SITE_URL}/films</loc>`);
    expect(body).toContain(`<loc>${SITE_URL}/a-propos</loc>`);
  });

  it('never lists a draft', async () => {
    const response = await sitemap({ request: get('/sitemap.xml'), env: env() });
    const body = await response.text();
    expect(body).not.toContain('contre-champs');
  });

  it('answers just the static routes on an empty database', async () => {
    const response = await sitemap({ request: get('/sitemap.xml'), env: env('') });
    expect(response.status).toBe(200);
    const body = await response.text();
    expect(body).toContain(`<loc>${SITE_URL}/films</loc>`);
    expect(body).not.toContain('/article/');
    expect(body).not.toContain('/bilan-culturel?mois=');
  });

  it('answers 500 without a DB binding', async () => {
    const response = await sitemap({ request: get('/sitemap.xml'), env: TEST_ENV });
    expect(response.status).toBe(500);
  });
});
