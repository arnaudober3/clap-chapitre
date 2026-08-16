import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as adminAproposRoute } from '../../functions/api/admin/pages/apropos';
import { onRequest as adminMeSuivreRoute } from '../../functions/api/admin/pages/me-suivre';
import { onRequest as aproposRoute } from '../../functions/api/pages/apropos';
import { onRequest as meSuivreRoute } from '../../functions/api/pages/me-suivre';
import { createTestDb } from './d1';
import { TEST_ENV, signTestToken } from './api-server';
import { SEED } from './fixtures';
import type { D1Database, Handler } from '../../functions/types';

let db: D1Database & { close(): void };

beforeEach(async () => {
  db = await createTestDb();
  await db.exec(SEED);
});

const env = () => ({ ...TEST_ENV, DB: db });

async function put(handler: Handler, body: unknown, token = true) {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (token) headers.authorization = `Bearer ${await signTestToken()}`;
  return handler({
    request: new Request('http://localhost/api/admin/pages/x', {
      method: 'PUT',
      headers,
      body: JSON.stringify(body),
    }),
    env: env(),
  });
}

const APROPOS = {
  eyebrow: 'À propos',
  greeting: 'Bonjour, moi c’est',
  name: 'Marie-Zoé',
  intro: 'J’écris sur ce que je regarde.',
  portraitImage: '',
  bio: 'Premier paragraphe.\n\nSecond paragraphe.',
  bioEmphasis: 'un bilan',
  quote: '« Un avis n’est jamais qu’une conversation. »',
  statsTitle: 'Cette année',
  followTitle: 'Me suivre',
  followCopy: 'Ailleurs aussi.',
  followCta: 'Voir',
  followTo: '/me-suivre',
  stats: [
    { label: 'Films & séries', value: 63 },
    { label: 'Livres', value: 21 },
  ],
};

const MESUIVRE = {
  eyebrow: 'Me suivre',
  title: 'On garde le contact',
  intro: 'Là où je parle aussi.',
  newsletterEyebrow: 'Newsletter',
  newsletterTitle: 'Une fois par mois',
  newsletterCopy: 'Le bilan, dans votre boîte.',
  newsletterPlaceholder: 'votre@email.fr',
  newsletterCta: 'S’inscrire',
  socials: [
    { name: 'Threads', handle: '@mariezoe', glyph: 'Th', url: 'https://threads.net/@mariezoe', cta: 'Suivre' },
    { name: 'Letterboxd', handle: '@mz', glyph: 'Lb', url: 'https://letterboxd.com/mz', cta: 'Suivre' },
  ],
};

describe('WR-5 À propos', () => {
  it('needs the admin token — reading stays public, writing does not', async () => {
    expect((await put(adminAproposRoute, APROPOS, false)).status).toBe(401);
  });

  it('saves, and the public endpoint reads back what was written', async () => {
    expect((await put(adminAproposRoute, APROPOS)).status).toBe(200);

    const payload = await (
      await aproposRoute({ request: new Request('http://localhost/api/pages/apropos'), env: env() })
    ).json();

    // The blank-line split is the round trip's other half: stored as one text,
    // handed over as the array the page maps.
    expect(payload.bio).toEqual(['Premier paragraphe.', 'Second paragraphe.']);
    expect(payload.stats).toEqual([
      { label: 'Films & séries', value: 63 },
      { label: 'Livres', value: 21 },
    ]);
  });

  it('upserts: it writes the page into a database that never had one', async () => {
    // The row is `id = 1` by constraint, so creating and updating are one act —
    // and an empty database is exactly when the editor first opens this form.
    await db.exec('DELETE FROM page_apropos');
    expect((await put(adminAproposRoute, APROPOS)).status).toBe(200);

    const row = await db.prepare('SELECT name FROM page_apropos WHERE id = 1').first();
    expect(row?.name).toBe('Marie-Zoé');
  });

  it('rewrites the ordered stats rather than renumbering them in place', async () => {
    // `apropos_stats.position` is the primary key; an UPDATE-in-place reorder
    // would collide on it.
    await put(adminAproposRoute, APROPOS);
    await put(adminAproposRoute, {
      ...APROPOS,
      stats: [
        { label: 'Livres', value: 21 },
        { label: 'Films & séries', value: 63 },
        { label: 'Docs', value: 9 },
      ],
    });

    const { results } = await db
      .prepare('SELECT position, label FROM apropos_stats ORDER BY position')
      .all<{ position: number; label: string }>();
    expect(results).toEqual([
      { position: 0, label: 'Livres' },
      { position: 1, label: 'Films & séries' },
      { position: 2, label: 'Docs' },
    ]);
  });

  it('refuses a portrait key it did not mint', async () => {
    const response = await put(adminAproposRoute, { ...APROPOS, portraitImage: '../secret' });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : portraitImage.' });
  });

  it('names the missing field', async () => {
    const { quote: _dropped, ...without } = APROPOS;
    const response = await put(adminAproposRoute, without);
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : quote.' });
  });
});

describe('WR-5 Me suivre', () => {
  it('saves the links in order, deriving each key from its name', async () => {
    expect((await put(adminMeSuivreRoute, MESUIVRE)).status).toBe(200);

    const { results } = await db
      .prepare('SELECT key, position, name, glyph FROM mesuivre_socials ORDER BY position')
      .all<{ key: string; position: number; name: string; glyph: string }>();
    // The client sends 'nouveau-3' for a row it just added — a React list key,
    // not a primary key. The server derives the real one.
    expect(results).toEqual([
      { key: 'threads', position: 0, name: 'Threads', glyph: 'Th' },
      { key: 'letterboxd', position: 1, name: 'Letterboxd', glyph: 'Lb' },
    ]);
  });

  it('reorders without colliding on the UNIQUE position', async () => {
    await put(adminMeSuivreRoute, MESUIVRE);
    const response = await put(adminMeSuivreRoute, {
      ...MESUIVRE,
      socials: [...MESUIVRE.socials].reverse(),
    });
    expect(response.status).toBe(200);

    const payload = await (
      await meSuivreRoute({
        request: new Request('http://localhost/api/pages/me-suivre'),
        env: env(),
      })
    ).json();
    expect(payload.socials.map((row: { name: string }) => row.name)).toEqual([
      'Letterboxd',
      'Threads',
    ]);
  });

  it('refuses two links that would fold onto the same key', async () => {
    const response = await put(adminMeSuivreRoute, {
      ...MESUIVRE,
      socials: [
        { ...MESUIVRE.socials[0], name: 'Threads' },
        { ...MESUIVRE.socials[1], name: 'threads' },
      ],
    });
    // Caught here, where the field can be named, rather than as a primary-key
    // abort halfway through the batch.
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : socials.' });
  });

  it('refuses a link with no usable name', async () => {
    const response = await put(adminMeSuivreRoute, {
      ...MESUIVRE,
      socials: [{ ...MESUIVRE.socials[0], name: '···' }],
    });
    expect(response.status).toBe(422);
  });

  it('saves an empty list — removing every link is a legitimate edit', async () => {
    await put(adminMeSuivreRoute, MESUIVRE);
    expect((await put(adminMeSuivreRoute, { ...MESUIVRE, socials: [] })).status).toBe(200);

    const row = await db
      .prepare('SELECT count(*) AS total FROM mesuivre_socials')
      .first<{ total: number }>();
    expect(row?.total).toBe(0);
  });

  it('refuses a link with a name but no URL', async () => {
    const response = await put(adminMeSuivreRoute, {
      ...MESUIVRE,
      socials: [
        ...MESUIVRE.socials,
        { name: 'GitHub', handle: '@mariezoe', glyph: 'Gh', url: '', cta: 'Suivre' },
      ],
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : url.' });
  });

  it('refuses a link with a URL but no name', async () => {
    const response = await put(adminMeSuivreRoute, {
      ...MESUIVRE,
      socials: [
        ...MESUIVRE.socials,
        { name: '', handle: '@mariezoe', glyph: 'Gh', url: 'https://github.com/mariezoe', cta: 'Suivre' },
      ],
    });
    expect(response.status).toBe(422);
    expect(await response.json()).toEqual({ error: 'Champ invalide : name.' });
  });

  it('adds a new link with a full name and URL', async () => {
    const response = await put(adminMeSuivreRoute, {
      ...MESUIVRE,
      socials: [
        ...MESUIVRE.socials,
        { name: 'GitHub', handle: '@mariezoe', glyph: 'Gh', url: 'https://github.com/mariezoe', cta: 'Suivre' },
      ],
    });
    expect(response.status).toBe(200);

    const payload = await (
      await meSuivreRoute({
        request: new Request('http://localhost/api/pages/me-suivre'),
        env: env(),
      })
    ).json();
    expect(payload.socials).toHaveLength(3);
    expect(payload.socials[2]).toMatchObject({
      name: 'GitHub',
      handle: '@mariezoe',
      glyph: 'Gh',
      url: 'https://github.com/mariezoe',
      cta: 'Suivre',
    });
  });
});
