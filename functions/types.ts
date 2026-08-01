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
/**
 * The slice of D1 the project uses, declared here for the same reason `Env` is:
 * importing `@cloudflare/workers-types` would put Workers globals on a tsconfig
 * that also typechecks `src/`. The runtime's `D1Database` satisfies these
 * members structurally, so a handler written against them runs unchanged in
 * production. Widen this as queries need more of the API.
 */
export interface D1Result<T = Record<string, unknown>> {
  results: T[];
  success: boolean;
  meta: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(
    statements: D1PreparedStatement[],
  ): Promise<D1Result<T>[]>;
  exec(query: string): Promise<{ count: number; duration: number }>;
}

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
  /**
   * The D1 binding. Optional because it is genuinely absent in two places: the
   * unit suite, which has no database, and any deployment where the binding was
   * never configured. `requireDb` turns that absence into a 500 rather than
   * letting a handler discover it mid-query.
   */
  DB?: D1Database;
}

/** The slice of the Pages Function context our handlers actually read. */
export interface FunctionContext {
  request: Request;
  env: Env;
}

export type Handler = (context: FunctionContext) => Promise<Response>;
