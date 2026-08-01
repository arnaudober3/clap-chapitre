/**
 * Shapes shared by the two admin auth Functions.
 *
 * Deliberately not `@cloudflare/workers-types`: pulling that in would force a
 * `types` entry on the tsconfig that also typechecks `src/` (through
 * `src/test/api-server.ts`), and its Workers globals conflict with the DOM lib
 * the client needs. The structural declarations below are all the handlers use,
 * and the real runtime satisfies them.
 */

/**
 * Server-side configuration. Local values come from `.dev.vars`; in production
 * these are Cloudflare Pages secrets. Never a build-time constant — that is the
 * whole point of this module existing.
 */
export interface Env {
  ADMIN_USERNAME: string;
  /** Lowercase hex SHA-256 of the admin password, 64 characters. */
  ADMIN_PASSWORD_HASH: string;
  /** HMAC key used to sign session tokens. */
  JWT_SECRET: string;
  /**
   * Delay applied to failed sign-ins, in milliseconds. Optional: defaults to
   * 250ms. The test suite sets '0' so a wrong-password assertion stays fast.
   */
  LOGIN_THROTTLE_MS?: string;
}

/** The slice of the Pages Function context our handlers actually read. */
export interface FunctionContext {
  request: Request;
  env: Env;
}

export type Handler = (context: FunctionContext) => Promise<Response>;
