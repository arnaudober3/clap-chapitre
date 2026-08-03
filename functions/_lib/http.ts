/** Response helpers shared by the auth endpoints. */
import type { FunctionContext, Handler } from '../types';

const JSON_HEADERS = {
  'content-type': 'application/json; charset=utf-8',
  // Credentials and session tokens have no business in any cache.
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
} as const;

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/** Answered when `requireEnv` throws — the deployment is missing its secrets. */
export function misconfigured(): Response {
  return json({ error: 'Configuration du serveur incomplète.' }, 500);
}

/**
 * No usable session. One wording for every cause — missing header, bad
 * signature, wrong `alg`, expiry, a `sub` from a previous ADMIN_USERNAME —
 * because the client does the same thing with all of them: send the editor back
 * to the login page. Telling a caller *which* check failed only helps a caller
 * who shouldn't be here.
 */
export function unauthorized(): Response {
  return json({ error: 'Session invalide.' }, 401);
}

/** The row genuinely does not exist. Distinct from an empty collection, which is a 200. */
export function notFound(): Response {
  return json({ error: 'Introuvable.' }, 404);
}

/** A row was created. The body carries its id — the caller needs it to navigate. */
export function created(body: unknown): Response {
  return json(body, 201);
}

/**
 * The write succeeded and there is nothing to say about it. Used by every DELETE:
 * returning the deleted row would invite a caller to keep rendering it.
 */
export function noContent(): Response {
  return new Response(null, { status: 204, headers: { 'cache-control': 'no-store' } });
}

/**
 * The request is well-formed but collides with something that already exists —
 * a bilan for a month that is already there. Distinct from `unprocessable`,
 * which means the payload itself is wrong: retrying this one after changing
 * *other* state can succeed.
 */
export function conflict(message: string): Response {
  return json({ error: message }, 409);
}

/**
 * A field of the JSON body the endpoint refuses to guess at — the write
 * counterpart of `badRequest`, which names a query parameter. 422 rather than
 * 400 so a malformed body (not JSON at all) stays distinguishable from a body
 * that parsed but says something the schema will not accept.
 */
export function unprocessable(field: string): Response {
  return json({ error: `Champ invalide : ${field}.` }, 422);
}

/**
 * The sliding window in `rate_hits` says this caller has posted enough. Worded
 * for a human, because unlike every other error here this one is read by a
 * visitor rather than by the admin client.
 */
export function tooManyRequests(): Response {
  return json({ error: 'Trop de messages envoyés. Réessayez dans un moment.' }, 429);
}

/**
 * A query parameter the endpoint refuses to guess at. Naming the parameter is
 * safe (it came from the caller) and saves a round of guesswork; the accepted
 * values stay out of the body — that is what the endpoint's own doc comment is for.
 */
export function badRequest(parameter: string): Response {
  return json({ error: `Paramètre invalide : ${parameter}.` }, 400);
}

/**
 * The binding resolved but the query failed — almost always "no such table",
 * i.e. the migrations were never applied. 503 rather than 500 because the fix is
 * to run them, not to redeploy. The SQL error stays in the logs.
 */
export function dbUnavailable(): Response {
  return json({ error: 'Base de données indisponible.' }, 503);
}

/**
 * The R2 counterpart. Distinct from `notFound()` on purpose: R2 answers null
 * for a missing object rather than throwing, so a throw means the bucket is
 * unreachable — a very different thing from an image that was never uploaded.
 */
export function storageUnavailable(): Response {
  return json({ error: 'Stockage des images indisponible.' }, 503);
}

/**
 * Both `onRequestPost` and `onRequest` are exported by each endpoint, and these
 * build the latter from the former. Pages is documented to prefer the
 * method-specific export, but wiring the fallback to the same handler means we
 * never have to rely on that precedence — nor does the dev plugin, which only
 * ever looks at `onRequest` for a GET.
 */
function methodOnly(method: string, handler: Handler): Handler {
  return (context: FunctionContext) => {
    if (context.request.method === method) return handler(context);
    return Promise.resolve(
      new Response(JSON.stringify({ error: 'Méthode non autorisée.' }), {
        status: 405,
        headers: { ...JSON_HEADERS, allow: method },
      }),
    );
  };
}

export function postOnly(handler: Handler): Handler {
  return methodOnly('POST', handler);
}

export function getOnly(handler: Handler): Handler {
  return methodOnly('GET', handler);
}

/**
 * One resource, several verbs, one module. `/api/admin/articles/:id` answers
 * GET, PUT and DELETE, and Pages resolves those to three separate exports — but
 * the dev plugin and the test stub both reach for `onRequest` first, so the
 * dispatch has to exist here too rather than being left to the platform.
 *
 * `allow` is built from the keys actually provided, so a 405 always tells the
 * truth about this particular route instead of repeating a hardcoded list.
 */
export function route(handlers: Partial<Record<Method, Handler>>): Handler {
  const allow = (Object.keys(handlers) as Method[]).join(', ');

  return (context: FunctionContext) => {
    const handler = handlers[context.request.method as Method];
    if (handler) return handler(context);
    return Promise.resolve(
      new Response(JSON.stringify({ error: 'Méthode non autorisée.' }), {
        status: 405,
        headers: { ...JSON_HEADERS, allow },
      }),
    );
  };
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';
