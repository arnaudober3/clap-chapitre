/**
 * POST /api/login — { username, password } → 200 { token } | 401 { error }
 *
 * The only place where the admin password hash is ever compared. It lives in
 * the Cloudflare environment, never in the bundle the browser downloads.
 */
import { sha256Hex, timingSafeEqualHex } from '../_lib/crypto';
import { requireEnv, type AdminConfig } from '../_lib/env';
import { json, misconfigured, postOnly } from '../_lib/http';
import { signToken } from '../_lib/jwt';
import type { Handler } from '../types';

/** Generous ceilings, purely to stop a caller from making us hash megabytes. */
const MAX_USERNAME_LENGTH = 256;
const MAX_PASSWORD_LENGTH = 1024;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const onRequestPost: Handler = async ({ request, env }) => {
  let config: AdminConfig;
  try {
    config = requireEnv(env);
  } catch {
    return misconfigured();
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Requête invalide.' }, 400);
  }

  const { username, password } = (body ?? {}) as {
    username?: unknown;
    password?: unknown;
  };
  if (
    typeof username !== 'string' ||
    typeof password !== 'string' ||
    username.length > MAX_USERNAME_LENGTH ||
    password.length > MAX_PASSWORD_LENGTH
  ) {
    return json({ error: 'Requête invalide.' }, 400);
  }

  // Both checks always run — no `&&` short-circuit. A wrong username must cost
  // the same as a wrong password, otherwise response time enumerates accounts.
  const candidate = await sha256Hex(password);
  const usernameMatches = username.trim().toLowerCase() === config.username;
  const passwordMatches = timingSafeEqualHex(candidate, config.passwordHash);

  if (!usernameMatches || !passwordMatches) {
    // Not a rate limit — a stateless runtime cannot keep a counter. It just
    // makes naive brute force ~50x slower for free. See CLAUDE.md for the WAF
    // rule that does the real work.
    if (config.throttleMs > 0) await sleep(config.throttleMs);
    return json({ error: 'Identifiants incorrects.' }, 401);
  }

  // The subject carries the canonical username, not what was typed.
  return json({ token: await signToken(config.username, config.jwtSecret) });
};

export const onRequest = postOnly(onRequestPost);
