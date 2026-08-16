import { describe, it, expect } from 'vitest';
import {
  badRequest,
  conflict,
  created,
  json,
  noContent,
  route,
  tooManyRequests,
  unprocessable,
} from '../../functions/_lib/http';
import type { FunctionContext } from '../../functions/types';

/** A context carrying nothing but a method — `route` reads nothing else. */
function context(method: string): FunctionContext {
  return {
    request: new Request('http://localhost/api/admin/articles/x', { method }),
    env: {} as FunctionContext['env'],
  };
}

const ok = async () => json({ seen: true });

describe('WR-1 route()', () => {
  it('dispatches each verb to its own handler', async () => {
    const handler = route({
      GET: async () => json({ verb: 'GET' }),
      PUT: async () => json({ verb: 'PUT' }),
      DELETE: async () => noContent(),
    });

    expect(await (await handler(context('GET'))).json()).toEqual({ verb: 'GET' });
    expect(await (await handler(context('PUT'))).json()).toEqual({ verb: 'PUT' });
    expect((await handler(context('DELETE'))).status).toBe(204);
  });

  it('answers 405 and advertises exactly the verbs it was given', async () => {
    const handler = route({ GET: ok, PUT: ok });
    const response = await handler(context('DELETE'));

    expect(response.status).toBe(405);
    // Derived from the keys, never hardcoded: a route that gains a verb must
    // not keep announcing the old list.
    expect(response.headers.get('allow')).toBe('GET, PUT');
    expect(await response.json()).toEqual({ error: 'Méthode non autorisée.' });
  });

  it('a POST-only route does not answer GET', async () => {
    const response = await route({ POST: ok })(context('GET'));
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('POST');
  });
});

describe('WR-1 write responses', () => {
  it('created() is a 201 carrying the body', async () => {
    const response = created({ id: 'un-dernier-ete' });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: 'un-dernier-ete' });
  });

  it('noContent() is a 204 with no body at all', async () => {
    const response = noContent();
    expect(response.status).toBe(204);
    expect(response.body).toBeNull();
    // Still uncacheable: a deleted row must not survive in a cache.
    expect(response.headers.get('cache-control')).toBe('no-store');
  });

  it('names the field on 422 and the parameter on 400 — they are different faults', async () => {
    const body = unprocessable('medium');
    const query = badRequest('sort');

    expect(body.status).toBe(422);
    expect(await body.json()).toEqual({ error: 'Champ invalide : medium.' });
    expect(query.status).toBe(400);
    expect(await query.json()).toEqual({ error: 'Paramètre invalide : sort.' });
  });

  it('conflict() carries its own wording, 429 carries one for a visitor', async () => {
    const clash = conflict('Un bilan existe déjà pour ce mois.');
    expect(clash.status).toBe(409);
    expect(await clash.json()).toEqual({ error: 'Un bilan existe déjà pour ce mois.' });

    const throttled = tooManyRequests();
    expect(throttled.status).toBe(429);
    // Read by a visitor, not by the admin client — hence the plain French.
    expect((await throttled.json()).error).toMatch(/Réessayez/);
  });
});
