/**
 * The one module that knows how the site talks to its own API.
 *
 * It exists for three things the pages should not each reinvent:
 *
 *   1. **The 401 rule**, which is the same one `src/auth/auth.ts` states out
 *      loud: *only a 401 drops the token*. A network failure or a 5xx keeps the
 *      session, because a misconfigured deployment quietly signing the editor
 *      out on a loop is worse than a session that outlives its server.
 *   2. **In-flight deduplication.** The header and the avis page mount in the
 *      same tick and want the same avis; without this they would ask twice.
 *   3. **A typed error.** A 404 has to be distinguishable from "not loaded yet"
 *      by the page, and `undefined` cannot carry that difference.
 *
 * There is no cache. A resolved request is forgotten immediately: caching would
 * mean owning invalidation, and nothing here changes often enough to pay for it.
 */
import { clearToken, getToken } from '../auth/auth';
import { NETWORK_ERROR, SERVER_ERROR } from './messages';

/**
 * A failed request. `status` is the HTTP code, or **0 when the request never got
 * an answer** — offline, DNS, dev server down. Zero is not a status a server can
 * send, so it cannot be confused with one.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the row is genuinely absent, as opposed to unreachable. */
  get isNotFound(): boolean {
    return this.status === 404;
  }
}

type UnauthorizedHandler = () => void;

let onUnauthorized: UnauthorizedHandler | undefined;

/**
 * Called when the server rejects the stored token. `AuthContext` registers
 * itself here so the admin shell can step down to the login page immediately,
 * instead of showing a signed-in layout full of failed panels.
 */
export function setUnauthorizedHandler(handler: UnauthorizedHandler | undefined): void {
  onUnauthorized = handler;
}

/** Requests currently in flight, keyed by path. Emptied as each settles. */
const inFlight = new Map<string, Promise<unknown>>();

export interface GetOptions {
  /**
   * Send the admin bearer token, if there is one. Required by every
   * `/api/admin/**` route; also set by `useArticleView`/`useBilanView` on the
   * public avis/bilan pages, so a signed-in editor's own reads can be told
   * apart from a reader's — an anonymous visitor has no token, so the header
   * is simply omitted for them.
   */
  admin?: boolean;
  /** Abort when the caller unmounts or moves on. */
  signal?: AbortSignal;
}

/**
 * GET `path` and parse its JSON, or throw `ApiError`.
 *
 * Deduplication is keyed on the path alone, and only applies to anonymous
 * requests: two admin calls could in principle carry different tokens, and
 * sharing a promise between them would hand one caller the other's answer.
 */
export function apiGet<T>(path: string, options: GetOptions = {}): Promise<T> {
  if (options.admin || options.signal) return request<T>(path, options);

  const pending = inFlight.get(path) as Promise<T> | undefined;
  if (pending) return pending;

  const promise = request<T>(path, options).finally(() => {
    inFlight.delete(path);
  }) as Promise<T>;
  inFlight.set(path, promise);
  return promise;
}

/** The verbs the write endpoints answer. */
export type WriteMethod = 'POST' | 'PUT' | 'DELETE';

export interface SendOptions extends GetOptions {
  /**
   * Raw bytes with their own content type, for `/api/admin/uploads`. Mutually
   * exclusive with a JSON body — the upload endpoint reads the file straight
   * from the request rather than out of a multipart envelope.
   */
  raw?: Blob;
}

/**
 * Write to `path` and parse the answer, or throw `ApiError`.
 *
 * Everything `apiGet` guarantees applies here — the 401 rule, the typed error,
 * the server's own wording — with one deliberate exception: **no deduplication**.
 * Two identical GETs can share an answer; two identical POSTs are two writes,
 * and collapsing them would silently drop one.
 *
 * A 204 answers nothing, which is what every DELETE returns, so the parse is
 * skipped rather than throwing on an empty body.
 */
export async function apiSend<T>(
  path: string,
  method: WriteMethod,
  body?: unknown,
  options: SendOptions = {},
): Promise<T> {
  return request<T>(path, options, { method, body });
}

/** POST a file's bytes. The server derives the key; the caller gets it back. */
export function apiUpload<T>(path: string, file: Blob, options: GetOptions = {}): Promise<T> {
  return request<T>(path, { ...options, raw: file }, { method: 'POST' });
}

interface Write {
  method: WriteMethod;
  body?: unknown;
}

async function request<T>(path: string, options: SendOptions, write?: Write): Promise<T> {
  const headers = new Headers();
  if (options.admin) {
    const token = getToken();
    if (token) headers.set('Authorization', `Bearer ${token}`);
  }

  let payload: BodyInit | undefined;
  if (options.raw) {
    // The file's own type, which is what the endpoint validates against and
    // stores as the object's metadata.
    headers.set('content-type', options.raw.type || 'application/octet-stream');
    payload = options.raw;
  } else if (write?.body !== undefined) {
    headers.set('content-type', 'application/json');
    payload = JSON.stringify(write.body);
  }

  let response: Response;
  try {
    response = await fetch(path, {
      method: write?.method ?? 'GET',
      headers,
      body: payload,
      signal: options.signal,
    });
  } catch (error) {
    // An abort is the caller changing its mind, not a failure to report: it is
    // rethrown untouched so `useApi` can tell the two apart.
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(0, NETWORK_ERROR);
  }

  if (response.status === 401) {
    // The single place a token dies, mirroring `checkAuth`.
    clearToken();
    onUnauthorized?.();
    throw new ApiError(401, SERVER_ERROR);
  }

  if (!response.ok) {
    const failure = (await response.json().catch(() => null)) as { error?: string } | null;
    // The wording comes from the server when it sent one, so there is a single
    // source of truth for it.
    throw new ApiError(response.status, failure?.error ?? SERVER_ERROR);
  }

  // Every DELETE answers 204 with no body; parsing it would throw on the empty
  // string. The caller's `T` is `void` in that case.
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
