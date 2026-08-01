/**
 * POST /api/verify — Authorization: Bearer <token> → 200 { username } | 401
 *
 * The authority on whether a session is real. The client decodes tokens for a
 * first-render guess (`src/auth/token.ts`); only this endpoint checks a
 * signature.
 */
import { requireEnv, type AdminConfig } from '../_lib/env';
import { json, misconfigured, postOnly } from '../_lib/http';
import { verifyToken } from '../_lib/jwt';
import type { Handler } from '../types';

const BEARER = /^Bearer\s+(\S+)$/i;

export const onRequestPost: Handler = async ({ request, env }) => {
  let config: AdminConfig;
  try {
    config = requireEnv(env);
  } catch {
    return misconfigured();
  }

  const authorization = (request.headers.get('authorization') ?? '').trim();
  const match = BEARER.exec(authorization);
  if (!match) return json({ error: 'Session invalide.' }, 401);

  // Covers a bad signature, an unexpected `alg`, and expiry alike: the client
  // only ever redirects to the login page, so one message is enough.
  const claims = await verifyToken(match[1], config.jwtSecret);
  if (!claims) return json({ error: 'Session invalide.' }, 401);

  // Rotating ADMIN_USERNAME invalidates sessions issued for the previous one.
  if (claims.sub !== config.username) {
    return json({ error: 'Session invalide.' }, 401);
  }

  return json({ username: claims.sub });
};

export const onRequest = postOnly(onRequestPost);
