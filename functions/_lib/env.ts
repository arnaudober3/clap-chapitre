/**
 * Reading — and validating — the server configuration.
 *
 * This is the one place where a mistake could open the admin space, so it is
 * deliberately unforgiving: no defaults, no "if the hash is missing, skip the
 * check". A misconfigured deployment throws, the caller answers 500, and nobody
 * gets in. Failing loudly beats failing open.
 */
import type { D1Database, Env, R2Bucket } from '../types';

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

  // Same normalization the mock applied: `.dev.vars` is hand-edited, so stray
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

/**
 * The R2 binding, same stance as `requireDb`. Absent in the unit suite and in
 * any deployment that skipped `wrangler r2 bucket create`, and in both cases the
 * honest answer is a 500 rather than an upload that silently goes nowhere.
 */
export function requireBucket(env: Partial<Env> | undefined): R2Bucket {
  const bucket = env?.MEDIA;
  if (!bucket || typeof bucket.put !== 'function') {
    throw new Error('Binding R2 manquant : MEDIA.');
  }
  return bucket;
}

/**
 * The salt used to hash caller IPs, deliberately *not* part of `AdminConfig`.
 *
 * Two reasons to keep it separate. A deployment can be missing it while the
 * admin space works perfectly — folding it into `requireEnv` would turn a
 * missing salt into a 500 on `/api/login`, which is a confusing way to learn
 * about it. And it must not be `JWT_SECRET`: rotating that one ends every
 * session on purpose, and it should not also wipe every like and unthrottle
 * every visitor as a side effect.
 *
 * Same minimum length as `JWT_SECRET`. A short salt is a rainbow table away
 * from being no salt, and the whole point is not to store addresses.
 */
export function requireIpSalt(env: Partial<Env> | undefined): string {
  if (!env) throw new Error("Contexte d'exécution sans environnement.");
  const salt = read(env, 'IP_SALT');
  if (salt.length < 16) {
    throw new Error('IP_SALT doit faire au moins 16 caractères.');
  }
  return salt;
}

/** The Resend API key. Same fail-closed stance as requireDb/requireBucket. */
export function requireResendKey(env: Partial<Env> | undefined): string {
  if (!env) throw new Error("Contexte d'exécution sans environnement.");
  return read(env, 'RESEND_API_KEY');
}

/** The newsletter's verified "From" address. */
export function requireNewsletterFrom(env: Partial<Env> | undefined): string {
  if (!env) throw new Error("Contexte d'exécution sans environnement.");
  return read(env, 'NEWSLETTER_FROM');
}

/**
 * The HMAC key behind unsubscribe tokens, deliberately not JWT_SECRET — same
 * reasoning as requireIpSalt: rotating a session secret must not invalidate
 * every unsubscribe link already sent.
 */
export function requireUnsubSecret(env: Partial<Env> | undefined): string {
  if (!env) throw new Error("Contexte d'exécution sans environnement.");
  const secret = read(env, 'NEWSLETTER_UNSUB_SECRET');
  if (secret.length < 16) {
    throw new Error('NEWSLETTER_UNSUB_SECRET doit faire au moins 16 caractères.');
  }
  return secret;
}

/**
 * The shared secret the cron Worker presents. Kept separate from AdminConfig:
 * the caller here is a machine on a timer, not a signed-in editor.
 */
export function requireCronSecret(env: Partial<Env> | undefined): string {
  if (!env) throw new Error("Contexte d'exécution sans environnement.");
  const secret = read(env, 'CRON_SECRET');
  if (secret.length < 16) {
    throw new Error('CRON_SECRET doit faire au moins 16 caractères.');
  }
  return secret;
}
