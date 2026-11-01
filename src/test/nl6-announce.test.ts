/**
 * The avis announcement routes, called directly — on the model of NL-4.
 * Resend is stubbed by `installApiStub` (see `setResendOutcome`).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { onRequest as announceRoute } from '../../functions/api/admin/newsletter/announce/[articleId]';
import { onRequest as announceTestRoute } from '../../functions/api/admin/newsletter/announce-test/[articleId]';
import { onRequest as bilanTestRoute } from '../../functions/api/admin/newsletter/test/[bilanId]';
import { onRequest as adminArticleRoute } from '../../functions/api/admin/articles/[id]';
import { onRequest as newsletterIndexRoute } from '../../functions/api/admin/newsletter/index';
import { buildAvisAnnouncement, renderAvisEmailHtml } from '../../functions/_lib/newsletter-email';
import { createTestDb } from './d1';
import { SEED } from './fixtures';
import { signTestToken, TEST_ENV, setResendOutcome } from './api-server';
import type { D1Database, Env, Handler } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(() => {
  db = createTestDb();
  db.exec(`${SEED}
    INSERT INTO newsletter_subscribers (email, status, subscribed_at, unsubscribe_token) VALUES
      ('a@exemple.fr', 'subscribed', datetime('now'), 'tok-a'),
      ('b@exemple.fr', 'subscribed', datetime('now'), 'tok-b');
    INSERT INTO newsletter_subscribers (email, status, subscribed_at, unsubscribed_at, unsubscribe_token)
      VALUES ('c@exemple.fr', 'unsubscribed', datetime('now'), datetime('now'), 'tok-c');
  `);
});

afterEach(() => {
  setResendOutcome('ok');
});

async function call(
  route: Handler,
  params: Record<string, string>,
  options: { method?: string; body?: unknown; env?: Env; signed?: boolean } = {},
) {
  const headers: Record<string, string> = {};
  if (options.signed !== false) headers.Authorization = `Bearer ${await signTestToken()}`;
  if (options.body) headers['content-type'] = 'application/json';
  return route({
    request: new Request('http://localhost/api/admin/x', {
      method: options.method ?? 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    }),
    env: options.env ?? { ...TEST_ENV, DB: db },
    params,
  });
}

const announce = (articleId: string, options?: Parameters<typeof call>[2]) =>
  call(announceRoute, { articleId }, options);

describe('NL-6 announcing an avis', () => {
  it('mails every subscribed address and records the announcement', async () => {
    const response = await announce('un-dernier-ete');
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload.recipientCount).toBe(2);
    expect(payload.failureCount).toBe(0);
    expect(payload.sentAt).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);

    const row = await db
      .prepare("SELECT subject, recipient_count FROM article_announcements WHERE article_id = 'un-dernier-ete'")
      .first<{ subject: string; recipient_count: number }>();
    expect(row?.subject).toBe('Clap et chapitre — Nouvel avis : Un dernier été');
    expect(row?.recipient_count).toBe(2);
  });

  it('never announces the same avis twice, unpublish and republish included', async () => {
    expect((await announce('un-dernier-ete')).status).toBe(201);
    expect((await announce('un-dernier-ete')).status).toBe(409);

    await db.exec(`
      UPDATE articles SET status = 'draft', published_at = NULL WHERE id = 'un-dernier-ete';
      UPDATE articles SET status = 'published', published_at = '2026-08-01' WHERE id = 'un-dernier-ete';
    `);
    expect((await announce('un-dernier-ete')).status).toBe(409);
  });

  it('404s a draft or an unknown avis, and records nothing', async () => {
    expect((await announce('contre-champs')).status).toBe(404);
    expect((await announce('fantome')).status).toBe(404);
    const count = await db
      .prepare('SELECT count(*) AS n FROM article_announcements')
      .first<{ n: number }>();
    expect(count?.n).toBe(0);
  });

  it('gives the slot back when nothing went out, so a retry can send', async () => {
    setResendOutcome('fail');
    expect((await announce('un-dernier-ete')).status).toBe(502);
    const left = await db
      .prepare('SELECT count(*) AS n FROM article_announcements')
      .first<{ n: number }>();
    expect(left?.n).toBe(0);

    setResendOutcome('ok');
    expect((await announce('un-dernier-ete')).status).toBe(201);
  });

  it('refuses an anonymous caller', async () => {
    expect((await announce('un-dernier-ete', { signed: false })).status).toBe(401);
  });

  it('fails closed without the Resend key', async () => {
    const env = { ...TEST_ENV, DB: db, RESEND_API_KEY: undefined } as unknown as Env;
    expect((await announce('un-dernier-ete', { env })).status).toBe(500);
  });
});

describe('NL-6 proof copy', () => {
  it('sends a test, even for a draft, without recording anything', async () => {
    const response = await call(announceTestRoute, { articleId: 'contre-champs' }, {
      body: { email: 'moi@exemple.fr' },
    });
    expect(response.status).toBe(200);
    const count = await db
      .prepare('SELECT count(*) AS n FROM article_announcements')
      .first<{ n: number }>();
    expect(count?.n).toBe(0);
  });

  it('names a bad address', async () => {
    const response = await call(announceTestRoute, { articleId: 'un-dernier-ete' }, {
      body: { email: 'pas-une-adresse' },
    });
    expect(response.status).toBe(422);
  });

  it('does not exist without NEWSLETTER_TEST_SENDS — production has no avis proof copy', async () => {
    for (const flag of [undefined, '', '0', 'true']) {
      const env = { ...TEST_ENV, DB: db, NEWSLETTER_TEST_SENDS: flag };
      const response = await call(announceTestRoute, { articleId: 'un-dernier-ete' }, {
        body: { email: 'moi@exemple.fr' },
        env,
      });
      expect(response.status).toBe(404);
    }
  });

  it('leaves the bilan proof copy alone, flag or not', async () => {
    const env = { ...TEST_ENV, DB: db, NEWSLETTER_TEST_SENDS: undefined };
    const response = await call(bilanTestRoute, { bilanId: '2026-07' }, {
      body: { subject: 'S', email: 'moi@exemple.fr' },
      env,
    });
    expect(response.status).toBe(200);
  });

  it('tells the avis editor whether its proof copy is on', async () => {
    const off = { ...TEST_ENV, DB: db, NEWSLETTER_TEST_SENDS: undefined };
    const article = await call(adminArticleRoute, { id: 'un-dernier-ete' }, { method: 'GET', env: off });
    expect((await article.json()).testSends).toBe(false);
    const on = await call(adminArticleRoute, { id: 'un-dernier-ete' }, { method: 'GET' });
    expect((await on.json()).testSends).toBe(true);
  });

  it('502s when Resend refuses', async () => {
    setResendOutcome('fail');
    const response = await call(announceTestRoute, { articleId: 'un-dernier-ete' }, {
      body: { email: 'moi@exemple.fr' },
    });
    expect(response.status).toBe(502);
  });
});

describe('NL-6 what the editor reads back', () => {
  it('tells the avis editor whether the avis was announced', async () => {
    const before = await call(adminArticleRoute, { id: 'un-dernier-ete' }, { method: 'GET' });
    expect((await before.json()).announcedAt).toBeNull();

    await announce('un-dernier-ete');
    const after = await call(adminArticleRoute, { id: 'un-dernier-ete' }, { method: 'GET' });
    expect((await after.json()).announcedAt).toMatch(/^\d{4}-\d{2}-\d{2} /);
  });

  it('lists the announcement among the sends, labelled as an avis', async () => {
    await announce('un-dernier-ete');
    const response = await call(newsletterIndexRoute, {}, { method: 'GET' });
    const { sends } = await response.json();
    expect(sends).toHaveLength(1);
    expect(sends[0]).toMatchObject({
      kind: 'avis',
      articleId: 'un-dernier-ete',
      bilanId: '',
      title: 'Un dernier été',
      recipientCount: 2,
    });
  });
});

describe('NL-6 the e-mail itself', () => {
  it('links to the avis and escapes what the editor typed', () => {
    const announcement = buildAvisAnnouncement(
      { id: 'un-ete', medium: 'film', title: 'Un <été>', hook: '', excerpt: 'Résumé & co', cover: 'cover-abc.jpg' },
      'https://site.test',
    );
    expect(announcement.eyebrow).toBe('Nouvel avis · Film');
    const html = renderAvisEmailHtml(announcement, 'https://site.test/desinscription?token=t');
    expect(html).toContain('https://site.test/article/un-ete');
    expect(html).toContain('https://site.test/api/media/cover-abc.jpg');
    expect(html).toContain('Un &lt;été&gt;');
    expect(html).toContain('Résumé &amp; co');
    expect(html).toContain('Se désabonner');
  });
});
