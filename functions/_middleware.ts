/**
 * Pages middleware — runs ahead of every request (static assets included), so
 * the scope guard below has to be the very first thing it does. For nearly
 * every request its only job is to fall straight through to `next()`.
 *
 * The one thing it actually does: serve a small prerendered HTML shell, with
 * real title/description/OG/Twitter tags, to a fixed allowlist of social
 * preview crawlers that never execute JavaScript (Facebook, Twitter/X,
 * LinkedIn, Slack, Discord, WhatsApp) — and only on the two routes people
 * actually share, an avis and the current bilan culturel. Every other
 * visitor, including Googlebot (which does execute JS), gets the unmodified
 * SPA. This is what makes a link shared to Slack or posted on Facebook show
 * the real review instead of the generic site card.
 *
 * Not reachable under `npm run dev` — the dev server (`vite/devApiPlugin.ts`)
 * has no concept of Pages' middleware/`next()` dispatch. Verify with the real
 * Workers runtime instead:
 *   npm run db:migrate && npm run db:example && npm run preview:cf
 *   curl -A "facebookexternalhit/1.1" http://127.0.0.1:8788/article/<id-seedé>
 */
import { requireDb } from './_lib/env';
import { SITE_URL } from './_lib/site';
import type { D1Database, FunctionContext } from './types';

const BOT_UA = /facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp/i;

interface ShellMeta {
  title: string;
  description: string;
  image?: string;
  url: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderShell(meta: ShellMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);
  const url = escapeHtml(meta.url);
  const imageTags = meta.image
    ? `\n    <meta property="og:image" content="${escapeHtml(meta.image)}" />` +
      `\n    <meta name="twitter:image" content="${escapeHtml(meta.image)}" />`
    : '';

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <title>${title} · Clap et chapitre</title>
    <meta name="description" content="${description}" />
    <link rel="canonical" href="${url}" />
    <meta property="og:title" content="${title}" />
    <meta property="og:description" content="${description}" />
    <meta property="og:type" content="article" />
    <meta property="og:url" content="${url}" />
    <meta property="og:site_name" content="Clap et chapitre" />
    <meta name="twitter:card" content="${meta.image ? 'summary_large_image' : 'summary'}" />
    <meta name="twitter:title" content="${title}" />
    <meta name="twitter:description" content="${description}" />${imageTags}
  </head>
  <body>
    <a href="${url}">${title}</a>
  </body>
</html>
`;
}

async function articleMeta(db: D1Database, id: string): Promise<ShellMeta | null> {
  const row = await db
    .prepare(`SELECT title, excerpt, cover FROM articles WHERE id = ? AND status = 'published'`)
    .bind(id)
    .first<{ title: string; excerpt: string; cover: string }>();
  if (!row) return null;
  return {
    title: row.title,
    description: row.excerpt,
    image: row.cover ? `${SITE_URL}/api/media/${row.cover}` : undefined,
    url: `${SITE_URL}/article/${id}`,
  };
}

async function bilanMeta(db: D1Database, mois: string | null): Promise<ShellMeta | null> {
  const row = mois
    ? await db
        .prepare(`SELECT id, title, mood FROM bilans WHERE id = ? AND status = 'published'`)
        .bind(mois)
        .first<{ id: string; title: string; mood: string | null }>()
    : await db
        .prepare(
          `SELECT id, title, mood FROM bilans
             WHERE status = 'published' ORDER BY published_at DESC, id DESC LIMIT 1`,
        )
        .first<{ id: string; title: string; mood: string | null }>();
  if (!row) return null;

  const cover = await db
    .prepare(
      `SELECT a.cover FROM bilan_avis ba
         JOIN articles a ON a.id = ba.article_id
        WHERE ba.bilan_id = ? AND a.status = 'published'
        ORDER BY ba.position LIMIT 1`,
    )
    .bind(row.id)
    .first<{ cover: string }>();

  return {
    title: row.title,
    description: row.mood ?? '',
    image: cover?.cover ? `${SITE_URL}/api/media/${cover.cover}` : undefined,
    url: `${SITE_URL}/bilan-culturel?mois=${row.id}`,
  };
}

export const onRequest = async (context: FunctionContext): Promise<Response> => {
  const { request, env, next } = context;
  const fallback = next ?? (async () => new Response(null, { status: 404 }));

  const url = new URL(request.url);
  const isArticle = /^\/article\/[^/]+$/.test(url.pathname);
  const isBilan = url.pathname === '/bilan-culturel';
  if (!isArticle && !isBilan) return fallback();

  if (!BOT_UA.test(request.headers.get('user-agent') ?? '')) return fallback();

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return fallback();
  }

  try {
    const meta = isArticle
      ? await articleMeta(db, decodeURIComponent(url.pathname.slice('/article/'.length)))
      : await bilanMeta(db, url.searchParams.get('mois'));
    if (!meta) return fallback();

    return new Response(renderShell(meta), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
    });
  } catch {
    return fallback();
  }
};
