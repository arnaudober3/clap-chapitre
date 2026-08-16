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
  /**
   * Left open on purpose. The runtime fills in `changes`, `last_row_id`,
   * `duration` and more depending on the statement, and pinning that shape here
   * would be a promise across D1 versions we cannot keep. `changes()` in
   * `_lib/write.ts` reads the one field the write paths need.
   */
  meta: Record<string, unknown>;
  results: T[];
  success: boolean;
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

/**
 * The slice of R2 the media routes use, declared structurally for the same
 * reason D1 is. Covers and the portrait are real files now, and R2 is where
 * they live: object storage with no egress fee, bound like a database rather
 * than reached over the network.
 *
 * `get` returns null for a missing key rather than throwing — the 404 is the
 * handler's to build.
 */
export interface R2Object {
  body: ReadableStream;
  httpMetadata?: { contentType?: string };
  size: number;
}

export interface R2Bucket {
  put(
    key: string,
    value: ArrayBuffer | ReadableStream,
    options?: { httpMetadata?: { contentType?: string } },
  ): Promise<unknown>;
  get(key: string): Promise<R2Object | null>;
  delete(key: string): Promise<void>;
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
   * Salt for hashing caller IPs — the key behind one-like-per-person and the
   * comment window. Separate from JWT_SECRET so rotating sessions does not also
   * wipe every like; see `requireIpSalt`.
   */
  IP_SALT?: string;
  /**
   * The D1 binding. Optional because it is genuinely absent in two places: the
   * unit suite, which has no database, and any deployment where the binding was
   * never configured. `requireDb` turns that absence into a 500 rather than
   * letting a handler discover it mid-query.
   */
  DB?: D1Database;
  /** The R2 binding holding covers and the portrait. Optional for the same reasons. */
  MEDIA?: R2Bucket;
  /**
   * Resend API key. Optional: absent means the newsletter send/test/dispatch
   * routes answer misconfigured() rather than sending unauthenticated.
   */
  RESEND_API_KEY?: string;
  /** The newsletter's "From" header — must be on a domain verified in Resend. */
  NEWSLETTER_FROM?: string;
  /**
   * HMAC key behind every unsubscribe token. Separate from JWT_SECRET so
   * rotating sessions never invalidates a link already sitting in an inbox —
   * see requireUnsubSecret.
   */
  NEWSLETTER_UNSUB_SECRET?: string;
  /**
   * Shared secret the standalone cron Worker presents on
   * POST /api/admin/newsletter/dispatch. Not part of AdminConfig: this route
   * is called by a machine, not a signed-in editor.
   */
  CRON_SECRET?: string;
}

/** The slice of the Pages Function context our handlers actually read. */
export interface FunctionContext {
  request: Request;
  env: Env;
  /**
   * The dynamic segments of a `[id].ts` route. Pages fills this in; a route with
   * no bracket in its filename never sees it, hence the optional. A `[[rest]]`
   * catch-all would hand over an array — none of our routes use one, but the
   * type says so rather than lying by omission.
   */
  params?: Record<string, string | string[]>;
  /**
   * Continues to the next handler in Pages' own dispatch chain — another
   * middleware, a matching Function, or the static asset / SPA fallback. Only
   * ever populated for `functions/_middleware.ts`; every other Function ignores
   * it, so adding it here is additive.
   */
  next?: () => Promise<Response>;
}

export type Handler = (context: FunctionContext) => Promise<Response>;
