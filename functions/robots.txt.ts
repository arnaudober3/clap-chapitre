/**
 * GET /robots.txt → 200 text/plain
 *
 * Static: no query parameters, no database read. Disallows the admin space —
 * it needs no crawler, and its content is behind the JWT anyway — and points at
 * the sitemap.
 */
import { getOnly } from './_lib/http';
import { SITE_URL } from './_lib/site';
import type { Handler } from './types';

const BODY = `User-agent: *
Disallow: /admin

Sitemap: ${SITE_URL}/sitemap.xml
`;

export const onRequestGet: Handler = async () =>
  new Response(BODY, {
    headers: {
      'content-type': 'text/plain; charset=utf-8',
      'cache-control': 'public, max-age=3600',
    },
  });

export const onRequest = getOnly(onRequestGet);
