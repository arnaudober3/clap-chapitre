/**
 * Reading a JSON body, strictly.
 *
 * The exact counterpart of `query.ts`, and for the same reason: a payload the
 * endpoint half-understands is worse than one it refuses. `{ status: 'publié' }`
 * must be a 422 naming `status`, never a silent fallback to 'draft' that looks
 * like a successful save and quietly unpublishes an avis.
 *
 * Every reader throws `BodyError` and the handlers turn it into
 * `unprocessable()`, so an endpoint never has to remember which of its fields
 * can fail. `readJson` is the one exception: a body that is not JSON at all
 * never reached the schema, so it is a 400 rather than a 422.
 */

export class BodyError extends Error {
  constructor(readonly field: string) {
    super(`Champ invalide : ${field}.`);
    this.name = 'BodyError';
  }
}

/** Raised by `readJson` alone: the request was not a JSON object to begin with. */
export class MalformedBody extends Error {
  constructor() {
    super('Requête invalide.');
    this.name = 'MalformedBody';
  }
}

/** 64 KB. An avis body is a few thousand characters; this is a ceiling, not a budget. */
const DEFAULT_MAX_BYTES = 64 * 1024;

/**
 * The parsed body, guaranteed to be a plain object.
 *
 * The size check reads `content-length` rather than buffering and measuring:
 * the point is to refuse *before* pulling megabytes into the isolate. A caller
 * omitting the header still gets bounded by the platform's own limit.
 */
export async function readJson(
  request: Request,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<Record<string, unknown>> {
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new MalformedBody();

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new MalformedBody();
  }

  // `typeof null === 'object'`, and an array would let `body.title` be undefined
  // rather than an error. Both are rejected here so the readers below can trust
  // what they receive.
  if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new MalformedBody();
  }
  return parsed as Record<string, unknown>;
}

/**
 * A required string. Trimmed, and empty after trimming counts as missing —
 * a title of three spaces is not a title.
 */
export function text(
  body: Record<string, unknown>,
  field: string,
  opts: { max: number },
): string {
  const value = body[field];
  if (typeof value !== 'string') throw new BodyError(field);
  const trimmed = value.trim();
  if (trimmed === '' || trimmed.length > opts.max) throw new BodyError(field);
  return trimmed;
}

/**
 * An optional string. Absent, null and empty all collapse to `undefined`, which
 * matches how `rows.ts` reads them back — the round trip stays lossless.
 *
 * A present-but-wrong type is still an error: `{ hook: 42 }` is a mistake, not
 * an omission.
 */
export function optionalText(
  body: Record<string, unknown>,
  field: string,
  opts: { max: number },
): string | undefined {
  const value = body[field];
  if (value === undefined || value === null || value === '') return undefined;
  if (typeof value !== 'string') throw new BodyError(field);
  const trimmed = value.trim();
  if (trimmed.length > opts.max) throw new BodyError(field);
  return trimmed === '' ? undefined : trimmed;
}

/**
 * A string from a closed set — status, medium, target type. The frozen list is
 * the caller's, so this stays the single check for every enumeration rather
 * than one `if` chain per endpoint.
 */
export function oneOf<T extends string>(
  body: Record<string, unknown>,
  field: string,
  values: readonly T[],
): T {
  const value = body[field];
  if (typeof value !== 'string' || !values.includes(value as T)) {
    throw new BodyError(field);
  }
  return value as T;
}

/** A required integer within bounds. `Number` over `parseInt`, as in `query.ts`. */
export function int(
  body: Record<string, unknown>,
  field: string,
  opts: { min?: number; max?: number } = {},
): number {
  const value = body[field];
  if (typeof value !== 'number' || !Number.isInteger(value)) throw new BodyError(field);
  if (opts.min !== undefined && value < opts.min) throw new BodyError(field);
  if (opts.max !== undefined && value > opts.max) throw new BodyError(field);
  return value;
}

/**
 * An ordered list of identifiers — a bilan's selection, an avis' related links.
 * The order *is* the editorial data, so it is preserved as sent; duplicates are
 * not, because `bilan_avis` has a composite primary key that would reject them
 * mid-batch with a 503 instead of a message naming the field.
 */
export function ids(
  body: Record<string, unknown>,
  field: string,
  opts: { max: number },
): string[] {
  const value = body[field];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > opts.max) throw new BodyError(field);

  const list = value.map((entry) => {
    if (typeof entry !== 'string' || entry.trim() === '') throw new BodyError(field);
    return entry.trim();
  });
  if (new Set(list).size !== list.length) throw new BodyError(field);
  return list;
}

/**
 * A nested list of objects — the bilan editor's cards, each carrying an avis id
 * plus the fields it edits inline. Returned untouched: the caller reads each
 * entry with the readers above, which is what keeps the field names in the
 * error messages accurate.
 */
export function objects(
  body: Record<string, unknown>,
  field: string,
  opts: { max: number },
): Record<string, unknown>[] {
  const value = body[field];
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > opts.max) throw new BodyError(field);

  return value.map((entry) => {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      throw new BodyError(field);
    }
    return entry as Record<string, unknown>;
  });
}
