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
