import { describe, it, expect, beforeEach } from 'vitest';
import { onRequest as uploadsRoute } from '../../functions/api/admin/uploads';
import { onRequest as mediaRoute } from '../../functions/api/media/[key]';
import { onRequest as articleRoute } from '../../functions/api/admin/articles/[id]';
import { createTestDb } from './d1';
import { createTestBucket, type TestBucket } from './r2';
import { TEST_ENV, signTestToken } from './api-server';
import { SEED } from './fixtures';
import type { D1Database } from '../../functions/types';

let db: D1Database & { close(): void };
let bucket: TestBucket;

beforeEach(() => {
  db = createTestDb();
  db.exec(SEED);
  bucket = createTestBucket();
});

const env = () => ({ ...TEST_ENV, DB: db, MEDIA: bucket });

/** A few bytes standing in for a poster — the handler never decodes them. */
const PIXELS = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);

async function upload(
  bytes: Uint8Array = PIXELS,
  type = 'image/png',
  query = '',
  token = true,
) {
  const headers: Record<string, string> = { 'content-type': type };
  if (token) headers.authorization = `Bearer ${await signTestToken()}`;
  return uploadsRoute({
    request: new Request(`http://localhost/api/admin/uploads${query}`, {
      method: 'POST',
      headers,
      // `.buffer`, not the view: `BodyInit` takes an ArrayBuffer.
      body: bytes.buffer as ArrayBuffer,
    }),
    env: env(),
  });
}

function fetchMedia(key: string) {
  return mediaRoute({
    request: new Request(`http://localhost/api/media/${key}`),
    env: env(),
    params: { key },
  });
}

describe('WR-9 uploading', () => {
  it('needs the admin token — an open upload endpoint is a free file host', async () => {
    expect((await upload(PIXELS, 'image/png', '', false)).status).toBe(401);
  });

  it('stores the bytes and answers a content-addressed key', async () => {
    const response = await upload();
    expect(response.status).toBe(201);

    const { key } = await response.json();
    expect(key).toMatch(/^cover-[0-9a-f]{64}\.png$/);
    expect(bucket.keys()).toEqual([key]);
  });

  it('gives the same file the same key, twice — which is what makes it cacheable', async () => {
    const first = await (await upload()).json();
    const second = await (await upload()).json();
    expect(second.key).toBe(first.key);
    expect(bucket.keys()).toHaveLength(1);
  });

  it('prefixes a portrait differently', async () => {
    const { key } = await (await upload(PIXELS, 'image/png', '?kind=portrait')).json();
    expect(key).toMatch(/^portrait-[0-9a-f]{64}\.png$/);
  });

  it('refuses a type outside the four raster formats', async () => {
    // SVG is an image by any prefix test, and a script host — serving one from
    // our own origin would hand it our cookies.
    for (const type of ['image/svg+xml', 'text/html', 'application/pdf']) {
      const response = await upload(PIXELS, type);
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: 'Paramètre invalide : content-type.' });
    }
  });

  it('refuses an empty body and one over five megabytes', async () => {
    expect((await upload(new Uint8Array(0))).status).toBe(400);
    expect((await upload(new Uint8Array(5 * 1024 * 1024 + 1))).status).toBe(400);
  });

  it('refuses an unknown kind', async () => {
    const response = await upload(PIXELS, 'image/png', '?kind=banniere');
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Paramètre invalide : kind.' });
  });

  it('answers 500 with no bucket bound, rather than losing the file quietly', async () => {
    const response = await uploadsRoute({
      request: new Request('http://localhost/api/admin/uploads', {
        method: 'POST',
        headers: {
          'content-type': 'image/png',
          authorization: `Bearer ${await signTestToken()}`,
        },
        body: PIXELS.buffer as ArrayBuffer,
      }),
      env: { ...TEST_ENV, DB: db },
    });
    expect(response.status).toBe(500);
  });
});

describe('WR-9 serving', () => {
  it('hands the bytes back, cached for a year', async () => {
    const { key } = await (await upload()).json();
    const response = await fetchMedia(key);

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/png');
    // Safe precisely because the key is the content's own digest: an object
    // under a given key can never change.
    expect(response.headers.get('cache-control')).toBe('public, max-age=31536000, immutable');
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(PIXELS);
  });

  it('is public: the site has to render these to everyone', async () => {
    const { key } = await (await upload()).json();
    expect((await fetchMedia(key)).status).toBe(200);
  });

  it('404s on a key it did not mint, without ever reaching the bucket', async () => {
    // The parameter is the only thing between a caller and the namespace.
    for (const key of ['../wrangler.toml', 'cover-abc.png', 'anything', '']) {
      expect((await fetchMedia(key)).status).toBe(404);
    }
  });

  it('404s on a well-formed key nothing was stored under', async () => {
    expect((await fetchMedia(`cover-${'a'.repeat(64)}.webp`)).status).toBe(404);
  });
});

describe('WR-9 orphans', () => {
  async function setCover(key: string) {
    return articleRoute({
      request: new Request('http://localhost/api/admin/articles/un-dernier-ete', {
        method: 'PUT',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${await signTestToken()}`,
        },
        body: JSON.stringify({
          title: 'Un dernier été',
          medium: 'film',
          excerpt: 'Un huis clos solaire.',
          cover: key,
          status: 'published',
        }),
      }),
      env: env(),
      params: { id: 'un-dernier-ete' },
    });
  }

  it('sweeps up the image an avis stopped pointing at', async () => {
    const first = (await (await upload()).json()).key as string;
    await setCover(first);

    const second = (await (await upload(new Uint8Array([1, 2, 3]))).json()).key as string;
    await setCover(second);

    expect(bucket.keys()).toEqual([second]);
  });

  it('keeps an image two rows share — the key is a digest, not an owner', async () => {
    const key = (await (await upload()).json()).key as string;
    await setCover(key);
    // The portrait happens to be the same file.
    await db.prepare('UPDATE page_apropos SET portrait_image = ? WHERE id = 1').bind(key).run();

    await setCover('');
    expect(bucket.keys()).toEqual([key]);
  });

  it('drops the affiche when the avis is deleted', async () => {
    const key = (await (await upload()).json()).key as string;
    await setCover(key);

    const response = await articleRoute({
      request: new Request('http://localhost/api/admin/articles/un-dernier-ete', {
        method: 'DELETE',
        headers: { authorization: `Bearer ${await signTestToken()}` },
      }),
      env: env(),
      params: { id: 'un-dernier-ete' },
    });
    expect(response.status).toBe(204);
    expect(bucket.keys()).toEqual([]);
  });
});
