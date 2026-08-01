/**
 * Reading — and validating — the server configuration.
 *
 * This is the one place where a mistake could open the admin space, so it is
 * deliberately unforgiving: no defaults, no "if the hash is missing, skip the
 * check". A misconfigured deployment throws, the caller answers 500, and nobody
 * gets in. Failing loudly beats failing open.
 */
import type { D1Database, Env } from '../types';

export interface AdminConfig {
  username: string;
  passwordHash: string;
  jwtSecret: string;
  throttleMs: number;
}

/** Lowercase hex SHA-256. Anything else means a truncated or mistyped secret. */
const HEX_SHA256 = /^[0-9a-f]{64}$/;

const DEFAULT_THROTTLE_MS = 250;

function read(env: Partial<Env>, key: keyof Env): string {
  const value = env[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`Variable d'environnement manquante : ${key}.`);
  }
  return value.trim();
}

export function requireEnv(env: Partial<Env> | undefined): AdminConfig {
  if (!env) throw new Error("Contexte d'exécution sans environnement.");

  // Same normalisation the mock applied: `.dev.vars` is hand-edited, so stray
  // case or spacing is expected. This is the canonical form the `sub` carries.
  const username = read(env, 'ADMIN_USERNAME').toLowerCase();
  const passwordHash = read(env, 'ADMIN_PASSWORD_HASH').toLowerCase();
  const jwtSecret = read(env, 'JWT_SECRET');

  if (!HEX_SHA256.test(passwordHash)) {
    throw new Error(
      'ADMIN_PASSWORD_HASH doit être un SHA-256 hexadécimal de 64 caractères.',
    );
  }
  if (jwtSecret.length < 16) {
    throw new Error('JWT_SECRET doit faire au moins 16 caractères.');
  }

  const rawThrottle = env.LOGIN_THROTTLE_MS?.trim();
  const throttleMs =
    rawThrottle === undefined || rawThrottle === ''
      ? DEFAULT_THROTTLE_MS
      : Number(rawThrottle);

  return {
    username,
    passwordHash,
    jwtSecret,
    throttleMs: Number.isFinite(throttleMs) && throttleMs > 0 ? throttleMs : 0,
  };
}

/**
 * The D1 binding, or an error. Separate from `requireEnv` because `read` above
 * insists on strings, and a binding is an object — but the stance is the same:
 * a missing binding is a misconfigured deployment, not something to work around.
 */
export function requireDb(env: Partial<Env> | undefined): D1Database {
  const db = env?.DB;
  if (!db || typeof db.prepare !== 'function') {
    throw new Error('Binding D1 manquant : DB.');
  }
  return db;
}
