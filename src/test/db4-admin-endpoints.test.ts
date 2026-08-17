/**
 * The back-office read endpoints, called directly.
 *
 * The first thing they have to get right is the gate: these are the routes that
 * hand out view counts and unpublished drafts, so an anonymous caller must get
 * nothing at all — not a filtered version. The rest checks that the query
 * parameters really reach the SQL, which is the half a page test cannot see.
 */
import { describe, expect, it } from 'vitest';
import { createTestDb } from './d1';
import { SEED } from './fixtures';
import { signTestToken, TEST_ENV } from './api-server';
import { onRequestGet as adminArticles } from '../../functions/api/admin/articles/index';
import { onRequestGet as adminArticle } from '../../functions/api/admin/articles/[id]';
import { onRequestGet as adminBilans } from '../../functions/api/admin/bilans/index';
import { onRequestGet as adminBilan } from '../../functions/api/admin/bilans/[id]';
import { onRequestGet as dashboard } from '../../functions/api/admin/dashboard';
import { lastMonths, monthAbbrev } from '../../functions/_lib/audience';
import type { Env } from '../../functions/types';

function env(sql = SEED): Env {
  const db = createTestDb();
  if (sql) void db.exec(sql);
  return { ...TEST_ENV, DB: db };
}

/** A signed-in request. */
async function get(url: string): Promise<Request> {
  return new Request(`http://localhost${url}`, {
    headers: { Authorization: `Bearer ${await signTestToken()}` },
  });
}

async function json<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

describe('DB-4 the admin gate', () => {
  const routes = [
    ['articles', adminArticles, '/api/admin/articles'],
    ['bilans', adminBilans, '/api/admin/bilans'],
    ['dashboard', dashboard, '/api/admin/dashboard'],
  ] as const;

  it.each(routes)('refuses %s without a token', async (_name, handler, url) => {
    const response = await handler({ request: new Request(`http://localhost${url}`), env: env() });
    expect(response.status).toBe(401);
    expect(await json<{ error: string }>(response)).toEqual({ error: 'Session invalide.' });
  });

  it.each(routes)('refuses %s with an expired token', async (_name, handler, url) => {
    const expired = await signTestToken(undefined, -1000);
    const response = await handler({
      request: new Request(`http://localhost${url}`, {
        headers: { Authorization: `Bearer ${expired}` },
      }),
      env: env(),
    });
    expect(response.status).toBe(401);
  });

  it('answers 500, not 401, when the server itself is misconfigured', async () => {
    // A broken deployment is not an expired session: getting this backwards
    // would have the editor signing in for ever against a server that cannot
    // accept them.
    const response = await adminArticles({
      request: new Request('http://localhost/api/admin/articles'),
      env: {} as Env,
    });
    expect(response.status).toBe(500);
  });
});

describe('DB-4 /api/admin/articles', () => {
  it('shows drafts first, and counts the whole catalogue separately', async () => {
    const response = await adminArticles({ request: await get('/api/admin/articles'), env: env() });
    const body = await json<{
      items: Array<{ id: string; status: string; views: number }>;
      total: number;
      catalogue: { total: number; drafts: number };
    }>(response);

    expect(body.items[0].status).toBe('draft');
    expect(body.total).toBe(3);
    expect(body.catalogue).toEqual({ total: 3, drafts: 1 });
    // View counts are exactly what makes this route privileged.
    expect(body.items.some((item) => item.views > 0)).toBe(true);
  });

  it('keeps the catalogue totals steady while the filter narrows the rows', async () => {
    const response = await adminArticles({
      request: await get('/api/admin/articles?status=draft'),
      env: env(),
    });
    const body = await json<{ total: number; catalogue: { total: number } }>(response);
    expect(body.total).toBe(1);
    // The subtitle must not move when the editor types in the search box.
    expect(body.catalogue.total).toBe(3);
  });

  it('searches titles without regard for case or accents', async () => {
    for (const term of ['ete', 'ÉTÉ', 'Été']) {
      const response = await adminArticles({
        request: await get(`/api/admin/articles?search=${encodeURIComponent(term)}`),
        env: env(),
      });
      const body = await json<{ items: Array<{ id: string }> }>(response);
      expect(body.items.map((item) => item.id)).toEqual(['un-dernier-ete']);
    }
  });

  it('treats a LIKE wildcard as a character, not as a pattern', async () => {
    const response = await adminArticles({
      request: await get('/api/admin/articles?search=%25'),
      env: env(),
    });
    // '%' matches no title here; unescaped it would have returned the catalogue.
    expect((await json<{ items: unknown[] }>(response)).items).toEqual([]);
  });

  it('sorts by views on request, and refuses a sort it does not know', async () => {
    const sorted = await adminArticles({
      request: await get('/api/admin/articles?status=published&sort=views'),
      env: env(),
    });
    const body = await json<{ items: Array<{ id: string }> }>(sorted);
    expect(body.items.map((item) => item.id)).toEqual(['un-dernier-ete', 'l-annee-de-la-pluie']);

    const rejected = await adminArticles({
      request: await get('/api/admin/articles?sort=alphabetique'),
      env: env(),
    });
    expect(rejected.status).toBe(400);
  });

  it('opens a draft, which the public route refuses', async () => {
    const response = await adminArticle({
      request: await get('/api/admin/articles/contre-champs'),
      env: env(),
      params: { id: 'contre-champs' },
    });
    const body = await json<{ article: { status: string; updatedAt: string } }>(response);
    expect(body.article.status).toBe('draft');
    // The wire carries the ISO edit time; the client words it.
    expect(body.article.updatedAt).toBeTruthy();
  });
});

describe('DB-4 /api/admin/bilans', () => {
  const WITH_DRAFT = `${SEED}
    INSERT INTO bilans (id,year,month,month_label,title,mood,status,updated_at,views,likes)
    VALUES ('2026-08',2026,8,'Août','Le mois en cours','','draft','2026-08-20T09:00:00Z',0,0);
  `;

  it('returns the month in progress beside the published ones, never among them', async () => {
    const response = await adminBilans({ request: await get('/api/admin/bilans'), env: env(WITH_DRAFT) });
    const body = await json<{
      items: Array<{ id: string; status: string }>;
      draft: { id: string } | null;
      catalogue: { published: number; drafts: number; since: { year: number; month: number } | null };
    }>(response);

    expect(body.items.every((item) => item.status === 'published')).toBe(true);
    expect(body.draft?.id).toBe('2026-08');
    expect(body.catalogue).toEqual({
      published: 1,
      drafts: 1,
      // The oldest published month, as figures — the page words it.
      since: { year: 2026, month: 7 },
    });
  });

  it('derives the next month from the highest id, rolling over December', async () => {
    const july = await adminBilan({
      request: await get('/api/admin/bilans/next'),
      env: env(),
      params: { id: 'next' },
    });
    expect((await json<{ next: { id: string } }>(july)).next.id).toBe('2026-08');

    const december = await adminBilan({
      request: await get('/api/admin/bilans/next'),
      env: env(`INSERT INTO bilans (id,year,month,month_label,title,status,published_at,views,likes)
                VALUES ('2026-12',2026,12,'Décembre','Le mois des listes','published','2027-01-02',0,0);`),
      params: { id: 'next' },
    });
    expect((await json<{ next: { id: string } }>(december)).next).toMatchObject({
      id: '2027-01',
      year: 2027,
      month: 1,
    });
  });

  it('has no next month to offer on an empty catalogue', async () => {
    const response = await adminBilan({
      request: await get('/api/admin/bilans/next'),
      env: env(''),
      params: { id: 'next' },
    });
    // Null rather than a guess from the server's clock, which would make the
    // form say something different depending on when it was opened.
    expect((await json<{ next: unknown }>(response)).next).toBeNull();
  });

  it('offers the oldest published avis\'s month for the very first bilan', async () => {
    const response = await adminBilan({
      request: await get('/api/admin/bilans/next'),
      env: env(`
        INSERT INTO articles (id,title,medium,excerpt,cover,author,status,published_at,likes,views)
        VALUES ('un-dernier-ete','Un dernier été','film','','','Marie-Zoé','published','2026-07-18',0,0),
               ('l-annee-de-la-pluie','L’année de la pluie','livre','','','Marie-Zoé','published','2026-05-04',0,0);
      `),
      params: { id: 'next' },
    });
    // No bilan exists yet, so there is no id to roll forward from — the first
    // bilan should cover the oldest avis on file, not the newest.
    expect((await json<{ next: { id: string } }>(response)).next).toMatchObject({
      id: '2026-05',
      year: 2026,
      month: 5,
    });
  });
});

describe('DB-4 /api/admin/dashboard', () => {
  // Five real view_hits, all within the last few hours — enough to give the
  // KPI and the trend's peak a known, non-zero value instead of asserting on
  // whatever an empty events table happens to compute.
  const WITH_VIEWS = `${SEED}
    INSERT INTO view_hits (target_type, target_id, viewed_at) VALUES
      ('bilan', '2026-07', datetime('now')),
      ('bilan', '2026-07', datetime('now', '-1 hours')),
      ('article', 'un-dernier-ete', datetime('now', '-2 hours')),
      ('article', 'un-dernier-ete', datetime('now', '-3 hours')),
      ('article', 'l-annee-de-la-pluie', datetime('now', '-4 hours'));
  `;

  it('computes the KPIs from real events and derives the ranking from the content tables', async () => {
    const response = await dashboard({
      request: await get('/api/admin/dashboard'),
      env: env(WITH_VIEWS),
    });
    const body = await json<{
      period: string;
      defaultPeriod: string;
      kpis: Array<{ key: string; value: number; deltaPct: number }>;
      leaderboard: Array<{ id: string; kind: string; views: number; articleId?: string }>;
      trendPeak: { month: string; views: number };
      drafts: Array<{ id: string }>;
    }>(response);

    expect(body.period).toBe('30j');
    expect(body.defaultPeriod).toBe('30j');
    expect(body.kpis.map((kpi) => kpi.key)).toEqual(['views', 'likes', 'comments', 'shares']);
    // Five views in the current window, none in the previous one: the
    // "went from nothing to something" case of the delta helper.
    expect(body.kpis.find((kpi) => kpi.key === 'views')).toEqual({
      key: 'views',
      label: 'Vues',
      value: 5,
      deltaPct: 100,
    });
    // Nothing seeds likes/comments.created_at/share_hits here.
    expect(body.kpis.find((kpi) => kpi.key === 'likes')?.value).toBe(0);
    expect(body.kpis.find((kpi) => kpi.key === 'comments')?.value).toBe(0);
    expect(body.kpis.find((kpi) => kpi.key === 'shares')?.value).toBe(0);

    // Avis and bilans are ranked together, by views.
    expect(body.leaderboard.map((row) => row.id)).toEqual([
      '2026-07',
      'un-dernier-ete',
      'l-annee-de-la-pluie',
    ]);
    // Only an avis is a link; a bilan has no article page.
    expect(body.leaderboard[0].articleId).toBeUndefined();

    // All five view_hits land in the current calendar month, the only one
    // with any views — so it is the peak regardless of which month "now" is.
    expect(body.trendPeak).toEqual({ month: monthAbbrev(lastMonths(1)[0]), views: 5 });
    expect(body.drafts.map((draft) => draft.id)).toEqual(['contre-champs']);
  });

  it('falls back to the default period rather than 400ing on a stale bookmark', async () => {
    const response = await dashboard({
      request: await get('/api/admin/dashboard?period=1789'),
      env: env(),
    });
    expect(response.status).toBe(200);
    expect((await json<{ period: string }>(response)).period).toBe('30j');
  });
});
