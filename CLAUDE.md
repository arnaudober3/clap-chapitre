# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Clap et chapitre** — a French cultural review site. A single fictional author
(Marie-Zoé) reviews works across four **media**: films, séries, livres, docs. All
**content** is static French mock data from `src/mock/` — no CMS. All UI copy is
in French. A D1 database exists but is **empty**: it is the groundwork for a
future persistence layer, and nothing on the site reads from it yet.

The one exception to "no backend" is admin authentication: two Cloudflare Pages
Functions in `functions/api/` check the editor's credentials server-side. A third,
`/api/db-health`, does nothing but prove the D1 binding is wired. Nothing else
crosses the network.

## Commands

```bash
npm run dev          # Vite dev server + /api Functions, host 0.0.0.0 (:5173)
npm run build        # typecheck src + functions, then vite build → dist/
npm run typecheck    # the three tsconfigs: src, functions, vite config
npm run preview      # serve the production build (no Functions)
npm run preview:cf   # build + wrangler pages dev — the real Cloudflare runtime
npm run deploy       # build + wrangler pages deploy
npm run db:migrate   # apply migrations/ to the local D1 (.wrangler/state/v3)
npm run db:reset     # wipe that local database, then migrate it again
npm run db:sql -- "SELECT name FROM sqlite_master"   # query it
npm test             # vitest run (one-shot)
npm run test:watch   # vitest watch mode
npx vitest run src/test/art3-article-body.test.tsx   # a single test file
npx vitest run -t "renders the hook"                 # tests matching a name
```

`npm run dev` needs a `.dev.vars` file (copy `.dev.vars.example`) — without it,
`/api/login` answers 500 and nobody can sign in. `npm run build` and `npm test`
need **no** secret and work on a fresh clone.

## Architecture

Vite + React 18 + TypeScript SPA, `react-router-dom` v6, client-side routing only.
No `_redirects` file is needed: Cloudflare Pages already serves `index.html` for
unmatched paths, and an explicit `/* /index.html 200` rule is rejected as an
infinite loop. Tests: Vitest + @testing-library/react + jsdom (`vite.config.ts`,
globals on).

`src/test/setup.ts` does three things: polyfills WebCrypto (`./webcrypto`, which
must be imported *first* — ES imports evaluate before the module body), points
`fetch` at the real Functions via `src/test/api-server.ts`, and stores a signed
token before each test so the whole suite runs signed in.

**Admin auth** — the only server-side code in the project.

```
POST /api/login   { username, password }         → 200 { token } | 401 { error }
POST /api/verify  Authorization: Bearer <token>  → 200 { username } | 401 { error }
```

`functions/api/login.ts` compares SHA-256(password) against `ADMIN_PASSWORD_HASH`
in constant time and issues an **HS256 JWT** signed with `JWT_SECRET` (12h TTL).
`functions/_lib/env.ts` **fails closed**: a missing or malformed secret is a 500,
never a bypass. `functions/_lib/` is deliberately *not* shared with `src/` — code
that touches JWT_SECRET should not be one import away from client code — hence a
small, documented duplication of base64url.

Client side, the token lives in localStorage under `cc-admin-token`.
`src/auth/token.ts` decodes it *without checking the signature*, which is what
lets `RequireAuth` decide on the first render instead of flashing the login page;
`/api/verify` is the authority and downgrades the session if it disagrees. In
`src/auth/auth.ts`, **only a 401 drops the token** — a network failure or a 5xx
keeps the optimistic session rather than signing the editor out on a loop.

In development, `vite/devApiPlugin.ts` serves those same Functions from the Vite
dev server (via `ssrLoadModule`, so they hot-reload), reading `.dev.vars` and —
for anything a dotenv file cannot hold — the bindings from `getPlatformProxy()`.
One port, one process, and the *real* handler code — local behaviour cannot drift
from production. Use `npm run preview:cf` to check the actual Workers runtime.
Its `ROUTES` table is static: **a new Function must be added there** or the SPA
fallback answers it with `index.html`.

Secrets: `.dev.vars` locally (gitignored, see `.dev.vars.example`), Cloudflare
Pages secrets in production — `wrangler pages secret put <KEY>`, repeated with
`--env preview` or previews answer 500. Rotating `ADMIN_PASSWORD_HASH` changes
the password without ending live sessions; rotating `JWT_SECRET` ends all of them
at once. Known gap: no application-level rate limit (a stateless runtime cannot
count), just a 250ms delay on failure — the real limit is a WAF rule on
`/api/login`, configured in the dashboard.

**The D1 database** (`DB` binding, `wrangler.toml`) is **empty on purpose**: the
site's content still comes from `src/mock/`, and the binding exists so the eventual
persistence layer has somewhere to land. `migrations/` holds one migration, whose
only table is a probe. `GET /api/db-health` reads it and is the sole consumer:
200 means the binding is wired and migrated, 503 means migrations are missing,
500 means there is no binding at all.

Local data lives in `.wrangler/state/v3` (gitignored), and `getPlatformProxy()`
persists to that same directory — so `npm run dev` and `npm run preview:cf` share
**one** SQLite file. Run `npm run db:migrate` after cloning; the tests need no
database. `database_id` in `wrangler.toml` is a placeholder until someone runs
`wrangler d1 create clap-et-chapitre`; deploying also means mirroring the
`[[d1_databases]]` block under `[env.preview]` and running `db:migrate:remote`,
since Pages does not apply migrations on deploy.

D1 is typed structurally in `functions/types.ts`, for the same reason `Env` is —
`@cloudflare/workers-types` would force Workers globals onto the tsconfig that
also typechecks `src/`. Widen those interfaces as queries need more of the API.

**Routing** (`src/App.tsx`): all routes render inside a shared `<Layout>` outlet.
- `/` → redirects to `/films`. The four medium feeds `/films` `/series` `/livres`
  `/docs` all render the **same** `HomePage`, filtered by medium.
- `/article/:id` → `ArticlePage`.
- `/archives` → redirects to `/archives/films`; `/archives/:medium` is always
  medium-filtered via the URL.
- `/bilan-culturel`, `/bilan-culturel/archives`, `/a-propos`, `/me-suivre`, and a
  `*` NotFound.

**The medium abstraction** (`src/media.ts`) is the single source of truth mapping
`Medium` (`'film' | 'serie' | 'livre' | 'doc'`) ↔ URL segment (`films`/`series`/…)
↔ display label. Use `MEDIA`, `SEGMENT_TO_MEDIUM`, `MEDIUM_TO_SEGMENT`,
`DEFAULT_SEGMENT` rather than hardcoding medium strings or route segments.

**Navigation model** (`src/components/layout/nav.ts`): `primaryNav` (medium feeds),
`secondaryNav` (standalone pages), `drawerNav` (mobile). The `<Layout>` shell is a
desktop left rail that collapses to a mobile top bar + drawer.

**Content types** (`src/mock/types.ts`): `Article` (an "avis"/review — the central
type, reused by feeds, article view, and bilans) and `Comment`. Mock data files in
`src/mock/` export the data plus **pure selector functions** (no React, no
module-level mutable state) so pages filter without side effects.

**Design system — "Salon"**: all palette hexes and layout constants live **only** in
`src/styles/tokens.css` as CSS custom properties. Every component references them via
`var(--…)` — never introduce raw palette hexes elsewhere. `src/styles/global.css` has
the reset/base. Fonts (Newsreader serif, IBM Plex Sans) are loaded in `index.html`.
Component styles use CSS Modules (`*.module.css`) colocated with their component.

**Page structure**: each page is a folder under `src/pages/<Name>/` with an
`index.tsx` entry, its own sub-components, and a colocated `*.module.css`.
Cross-page reusable primitives live in `src/components/ui/` (barrel-exported from
`src/components/ui/index.ts`).

## Conventions

- Test files are named by feature-area prefix + subtask number (e.g. `art*` =
  Article, `bc*` = Bilan culturel, `ap*` = À propos, `ms*` = Me suivre, `sc*` =
  scaffold, `ar*` = archives, `al*` = auth/login, `db*` = database). Match the
  existing prefix when adding tests.
- **The suite has no D1.** `TEST_ENV` carries no `DB`, and tests that need one
  build a small object satisfying the interfaces in `functions/types.ts` — which
  also keeps those declarations honest. Real SQL belongs in a Miniflare-backed
  suite, the day there are real tables.
- **Never `vi.mock` the auth layer.** Tests exercise the real handlers through
  the `fetch` stub, so what runs under vitest is what runs in production. Test
  credentials live in `src/test/credentials.ts`, independent of `.dev.vars` so a
  fresh clone and CI need no secret.
- TypeScript is strict with `noUnusedLocals`/`noUnusedParameters` — unused symbols
  fail the build.
- Covers/portraits are CSS gradient strings, not image URLs — keep it network-free.
