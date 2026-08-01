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
 * Both `onRequestPost` and `onRequest` are exported by each endpoint, and this
 * builds the latter from the former. Pages is documented to prefer the
 * method-specific export, but wiring the fallback to the same handler means we
 * never have to rely on that precedence — nor does the dev plugin.
 */
export function postOnly(handler: Handler): Handler {
  return (context: FunctionContext) => {
    if (context.request.method === 'POST') return handler(context);
    return Promise.resolve(
      new Response(JSON.stringify({ error: 'Méthode non autorisée.' }), {
        status: 405,
        headers: { ...JSON_HEADERS, allow: 'POST' },
      }),
    );
  };
}
