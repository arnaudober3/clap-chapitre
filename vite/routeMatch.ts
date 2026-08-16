/**
 * The file routing Cloudflare Pages applies to `functions/`, reduced to the one
 * rule this project uses: a `[name].ts` file matches a single path segment and
 * hands it over as `context.params.name`.
 *
 * It exists because two places have to agree on that rule — the Vite dev server
 * (`devApiPlugin.ts`) and the test stub (`src/test/api-server.ts`) — and because
 * neither of them runs Pages' own router. Production does not import this file:
 * there, the real router does the work. So the risk this module carries is
 * *divergence*, which is exactly why it is one small function with one behaviour
 * rather than a copy on each side.
 *
 * Matching is ordered and first-wins, like Pages: a static segment declared
 * before a dynamic one outranks it, so `/api/bilans/latest` can be served by
 * `[id].ts` while a future `/api/bilans/nouveau` could take precedence simply by
 * being listed first.
 */

/** One entry of a route table: a path pattern and whatever it resolves to. */
export interface RoutePattern<T> {
  /** Path with optional `:name` segments, e.g. `/api/articles/:id`. */
  pattern: string;
  /** What the caller wants back — a module path, or a handler itself. */
  target: T;
}

export interface RouteMatch<T> {
  target: T;
  params: Record<string, string>;
}

/**
 * Resolve `pathname` against `routes`, first match wins.
 *
 * Segment counts must line up exactly: `/api/articles` and `/api/articles/:id`
 * are different routes, and a trailing slash is trimmed rather than treated as
 * an empty final segment — `/api/bilans/` is the collection, not a bilan whose
 * id is the empty string.
 */
export function matchRoute<T>(
  pathname: string,
  routes: ReadonlyArray<RoutePattern<T>>,
): RouteMatch<T> | undefined {
  const parts = segments(pathname);

  for (const route of routes) {
    const shape = segments(route.pattern);
    if (shape.length !== parts.length) continue;

    const params: Record<string, string> = {};
    let matched = true;

    for (let i = 0; i < shape.length; i += 1) {
      const expected = shape[i];
      if (expected.startsWith(':')) {
        // An empty segment (`//`, or a trailing slash mid-path) is not a value.
        if (!parts[i]) {
          matched = false;
          break;
        }
        params[expected.slice(1)] = decodeURIComponent(parts[i]);
      } else if (expected !== parts[i]) {
        matched = false;
        break;
      }
    }

    if (matched) return { target: route.target, params };
  }

  return undefined;
}

function segments(path: string): string[] {
  return path.replace(/\/+$/, '').split('/').slice(1);
}
