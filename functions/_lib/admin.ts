/**
 * The admin gate, in one place.
 *
 * `/api/verify` used to carry this logic alone, which was fine while it was the
 * only endpoint that read a token. Now every `/api/admin/**` route needs the same
 * three checks — signature, algorithm, and the `sub` still matching the
 * configured username — and three checks copied five times is four chances to
 * forget one.
 *
 * The admin endpoints expose view counts and unpublished drafts. That is the
 * whole reason this exists: the public endpoints can be read by anyone, these
 * cannot.
 */
import { requireEnv, type AdminConfig } from './env';
import { misconfigured, unauthorized } from './http';
import { verifyToken } from './jwt';
import type { Env } from '../types';

const BEARER = /^Bearer\s+(\S+)$/i;

/** Either the caller is the editor, or here is the response to send back. */
export type AdminCheck =
  | { ok: true; username: string; config: AdminConfig }
  | { ok: false; response: Response };

/**
 * Resolve the caller's session, failing closed.
 *
 * A malformed environment answers 500, not 401: the deployment is broken, the
 * caller is not. Getting that backwards would let a missing JWT_SECRET read as
 * "your session expired", and the editor would keep signing in against a server
 * that cannot ever accept them.
 */
export async function requireAdmin(request: Request, env: Env): Promise<AdminCheck> {
  let config: AdminConfig;
  try {
    config = requireEnv(env);
  } catch {
    return { ok: false, response: misconfigured() };
  }

  const match = BEARER.exec((request.headers.get('authorization') ?? '').trim());
  if (!match) return { ok: false, response: unauthorized() };

  const claims = await verifyToken(match[1], config.jwtSecret);
  if (!claims) return { ok: false, response: unauthorized() };

  // Rotating ADMIN_USERNAME invalidates sessions issued for the previous one.
  if (claims.sub !== config.username) return { ok: false, response: unauthorized() };

  return { ok: true, username: claims.sub, config };
}
