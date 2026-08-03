# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Clap et chapitre** — a French cultural review site. A single fictional author
(Marie-Zoé) reviews works across four **media**: films, séries, livres, docs. All
UI copy is in French.

**Every page reads its content from the D1 database**, through the Pages
Functions in `functions/api/`. The database ships **empty**: the site knows how
to render its empty states, and the editor fills it herself. There is a
demonstration set outside `migrations/` — `npm run db:example` — to see the site
alive locally.

**Reading only.** No endpoint writes. The admin forms are still inert: they load
real content, let it be edited on screen, and persist nothing. Writing is the
next piece of work, and the schema was designed for it (`migrations/0001_contenu.sql`).

What is left of `src/mock/` is the newsletter, which is out of that scope and
still runs on static data.

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
npm run db:example   # load examples/contenu-exemple.sql into it (never automatic)
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

**The API** — `functions/api/`, all reads, all GET.

```
GET /api/feed?medium=&limit=          the medium's newest avis (home)
GET /api/articles?medium=&page=       the medium's archive, paginated
GET /api/articles/:id                 the avis view: avis, related, prev/next, bilan, thread
GET /api/bilans                       every published month + chips, counts, covers
GET /api/bilans/:id                   one month ('AAAA-MM' or 'latest') + its avis and thread
GET /api/pages/apropos                the "À propos" page
GET /api/pages/me-suivre              the "Me suivre" page

GET /api/admin/articles?status=&medium=&search=&sort=&page=    listing + catalogue totals
GET /api/admin/articles/:id                                    one avis, drafts included
GET /api/admin/bilans?search=&sort=&page=                      listing + the month in progress
GET /api/admin/bilans/:id                                      one month, or 'next'
GET /api/admin/dashboard?period=                               the six cards, one request
```

Two rules run through all of them. **One page, one request**: the avis view
issues five SQL statements server-side and returns them together, rather than
letting the page make five round-trips. And **the wire carries ISO only** — no
French display string is ever built server-side; `src/api/map.ts` turns
`publishedAt` into "18 juillet 2026" on arrival, so `src/format.ts` stays the
single source of French formatting.

`/api/admin/**` is behind the JWT (`functions/_lib/admin.ts`, shared with
`/api/verify`): those routes hand out view counts and unpublished drafts, so an
anonymous caller gets nothing rather than a filtered version.

Query parameters are validated, not coerced: `?medium=flim` is a 400, never a
silent fallback to "every medium". Sorts come from a frozen lookup table
(`functions/_lib/sql.ts`) — an unknown sort is a 400, and no parameter is ever
interpolated into SQL.

**Admin auth**.

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

**The D1 database** (`DB` binding, `wrangler.toml`) holds the whole site.
`migrations/0000_socle.sql` is the probe `GET /api/db-health` reads (200 wired and
migrated, 503 not migrated, 500 no binding at all); `migrations/0001_contenu.sql`
is the content schema. Its decisions, worth knowing before changing a query:

- **One `articles` table** for the feed avis and the bilan ones alike. The
  prototype kept two sets, which is why an avis could be reachable at
  `/article/:id` yet invisible in the archives.
- `bilan_avis` is a **join table**, not a column: the editor's picker offers avis
  from other months, so the relation is genuinely n..n. `position` carries an
  editorial order, never a grouping by medium.
- `bilan_counts` is **stored, not derived**. The archive months show their chips
  without carrying their avis; counting would zero them out.
- **No display strings are stored.** `articles.published_at` is ISO and the
  French date is built at render time. `bilans.month_label` is the one exception,
  and only because the admin search reads it.
- The comment thread is **one polymorphic table**, one level deep, enforced by a
  trigger — the only guard there is while nothing writes through an API.
- The editorial pages are **columns and ordered tables**, not JSON documents: the
  forms edit field by field, and content gets inserted by hand.
- Accent-insensitive search is an expression built in `functions/_lib/sql.ts`; it
  must fold exactly like `fold()` in `functions/_lib/text.ts` and `src/format.ts`,
  or "été" stops matching "ete" with nothing to show why.

Local data lives in `.wrangler/state/v3` (gitignored), and `getPlatformProxy()`
persists to that same directory — so `npm run dev` and `npm run preview:cf` share
**one** SQLite file. Run `npm run db:migrate` after cloning, then
`npm run db:example` for something to look at.

Inserting content by hand: `npm run db:sql` passes the whole statement to the
shell as one argument, and a French apostrophe has to be doubled for SQL *and*
protected from the shell. Use a `.sql` file and `--file` instead — see
`examples/contenu-exemple.sql`, whose header spells out both traps.

Remotely there is a **single** database, `clap-chapitre`, and preview deployments
inherit the top-level binding — they read the same one production does. That is
tolerable only while production is empty: **the day it holds real content,
previews need their own** under `[[env.preview.d1_databases]]`, or a preview
branch reads live content. Pages never applies migrations on deploy, so a
schema change means running `npm run db:migrate:remote` by hand.

The Pages project is Git-connected: `main` deploys to production, every other
branch to a preview. Checking a deployment is one request, because `db-health`
reads the database live — a migration fixes a 503 with no rebuild:

```bash
npx wrangler pages deployment list --project-name clap-chapitre   # find the URL
curl https://<id>.clap-chapitre.pages.dev/api/db-health           # 200 / 503 / 500
```

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

**Content types** (`shared/content.ts`): `Article` (an "avis"/review — the central
type, reused by feeds, article view and bilans), `Bilan` and `Comment`, each in
two flavours. The plain ones are what components render; the `Wire*` ones are what
the API carries, and they differ in exactly one way — the wire holds ISO values
where the render types hold French display strings.

The file sits outside both `src/` and `functions/` because both read it: a column
that stops matching a field becomes a compile error rather than an `undefined` in
a hero. It holds types only, no runtime, so it does not cross the security
boundary that keeps `functions/_lib/` out of the client bundle.

**Reading data** (`src/api/`): one hook per view — `useFeed`, `useArticleView`,
`useBilanList`, `useAdminArticles`… They replace the old mock selectors one for
one. `useApi` carries the three things every page needs: a loading state that is
*not* "absent" (a 404 arrives as an `ApiError`, never as missing data), a guard so
a stale answer never overwrites a newer one, and `path === null` for a component
that must not fetch at all. `client.ts` owns the 401 rule, shared with the auth
layer.

Rule of thumb for components: **a component that used to call a selector now
takes the data as a prop.** One page per screen knows there is a network.

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
- **The suite runs real SQL.** `src/test/d1.ts` builds an in-memory SQLite
  database (`node:sqlite`, no dependency) with the project's own migrations
  applied, and satisfies the `D1Database` interface. A test calls `useTestDb(SEED)`
  to get one; `src/test/fixtures.ts` holds the shared content, in both its object
  and its SQL form. `TEST_ENV` still carries **no** `DB` — a test that never asks
  for one gets the 500 an unconfigured deployment would give, which is what keeps
  `requireDb` honest.
- A fake `prepare()` returning canned rows was the alternative, and it was
  rejected: it would have to recognise queries by their text, so rewording one
  would break twenty page tests for the wrong reason.
- **Never `vi.mock` the auth layer.** Tests exercise the real handlers through
  the `fetch` stub, so what runs under vitest is what runs in production. Test
  credentials live in `src/test/credentials.ts`, independent of `.dev.vars` so a
  fresh clone and CI need no secret.
- TypeScript is strict with `noUnusedLocals`/`noUnusedParameters` — unused symbols
  fail the build.
- Covers/portraits are CSS gradient strings, not image URLs — keep it network-free.
