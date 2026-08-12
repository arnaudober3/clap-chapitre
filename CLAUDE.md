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

**The site writes too.** The four editors persist: avis and bilans can be
created, saved, published, unpublished and deleted; the "À propos" and "Me
suivre" pages are saved whole. Visitors can post comments — which land in a
moderation queue and stay invisible until released from `/admin/commentaires` —
toggle a ♡, deduplicated per address, and share to a channel. Covers and the
portrait are real images in R2, uploaded from the forms.

**The admin dashboard's KPI band and 12-month trend are computed from real
audience events**, not stored placeholders: every visit to a published avis or
bilan, every like, every approved comment and every share click is logged
(`view_hits`, `share_hits`, `likes.created_at`, `comments.created_at`), and
`GET /api/admin/dashboard` derives the four cards' values and deltas, and the
trend's points, from those tables at read time.

Three actions, not one, in every editor (`src/components/ui/EditorActions`):
**Enregistrer** stores without touching the publication state, **Publier** /
**Dépublier** changes only that, **Supprimer** asks first. A single button could
not express the difference, and a draft going live because "Enregistrer" was the
only control on screen is exactly the mistake this prevents.

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

**The API** — `functions/api/`.

```
GET  /api/feed?medium=&limit=         the medium's newest avis (home)
GET  /api/articles?medium=&page=      the medium's archive, paginated
GET  /api/articles/:id                the avis view: avis, related, prev/next, bilan, thread
GET  /api/bilans                      every published month + chips, counts, covers
GET  /api/bilans/:id                  one month ('AAAA-MM' or 'latest') + its avis and thread
GET  /api/pages/apropos               the "À propos" page
GET  /api/pages/me-suivre             the "Me suivre" page
GET  /api/media/:key                  an image, cached a year (see the R2 section)
POST /api/comments                    deposits a comment in moderation → 201 { queued }
POST /api/likes                       toggles a ♡ → 200 { likes, liked }
POST /api/shares                      records a share click → 201 { recorded }

GET    /api/admin/articles?status=&medium=&search=&sort=&page=  listing + catalogue totals
POST   /api/admin/articles                                      creates → 201 { id }
GET    /api/admin/articles/:id                                  one avis, drafts included
PUT    /api/admin/articles/:id                                  replaces it wholesale
DELETE /api/admin/articles/:id                                  204
GET    /api/admin/bilans?search=&sort=&page=                    listing + the month in progress
POST   /api/admin/bilans                                        creates → 201 | 409
GET    /api/admin/bilans/:id                                    one month, or 'next'
PUT    /api/admin/bilans/:id                                    month + selection + chips + cards
DELETE /api/admin/bilans/:id                                    204
PUT    /api/admin/pages/apropos                                 upserts the page
PUT    /api/admin/pages/me-suivre                               upserts the page
GET    /api/admin/comments?status=&page=                        the moderation queue
PUT    /api/admin/comments/:id                                  approves (or re-queues)
DELETE /api/admin/comments/:id                                  204
POST   /api/admin/uploads?kind=                                 raw image bytes → 201 { key }
GET    /api/admin/dashboard?period=                             the six cards, computed from real events
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
interpolated into SQL. **Bodies are read the same way**, by `functions/_lib/body.ts`:
a bad field is a 422 naming it, a body that is not a JSON object is a 400. The
project shapes live in `_lib/inputs.ts`, so a POST and a PUT cannot drift into
accepting slightly different things.

**Writing** — the parts that are not obvious from the handlers:

- **A PUT replaces, it does not patch.** The forms hold the whole avis on
  screen, so an omitted optional is the editor clearing it. A partial payload
  would make "cleared" and "not sent" the same request.
- `publication()` in `_lib/write.ts` owns `CHECK ((status = 'published') =
  (published_at IS NOT NULL))`. Publishing stamps a date, unpublishing clears
  it, and re-saving a live avis keeps the original. Nothing else touches the pair.
- `updated_at` has a DEFAULT but **no trigger** — every UPDATE sets it explicitly.
- **Ordered tables are rewritten, never renumbered.** `bilan_avis` carries
  `UNIQUE (bilan_id, position)`, `mesuivre_socials` a UNIQUE `position`: moving a
  row into an occupied slot aborts the statement. `reorder()` deletes then
  re-inserts, inside `batch()` — D1's only transaction.
- Saving a bilan **also writes into `articles`**: its cards edit the avis inline.
  It never touches their medium, cover or publication, so a month cannot
  unpublish an avis as a side effect.
- Anything a foreign key would reject is checked first (`hasMissingRelated`,
  `mediaOf`), because a constraint abort is indistinguishable from "the
  migrations were never applied" — one is a 422, the other a 503.
- Deleting an avis or a bilan clears its `comments` and `likes` **by hand**:
  both carry a polymorphic `target_id` with no foreign key to cascade through.

**Public writes** — the three routes an anonymous caller can write through.
`/api/comments` layers its guards cheapest-first: a honeypot field, a
three-second minimum since the composer mounted (bounded at both ends —
`Number(null)` is 0, which would otherwise read as "opened at the epoch"), then
a sliding window in `rate_hits` keyed on a salted IP digest. The first two
answer **201 anyway** and write nothing: telling a bot which check caught it
tells it what to change.

None of that is the real guard. A comment lands `pending` and is invisible until
released — so every query reading `comments` filters `status = 'approved'`,
including the card counts in `_lib/articles.ts`. Forgetting one is how the queue
stops moderating anything.

Likes are deduplicated per address and the displayed counter is **recomputed**
from the `likes` table on every toggle, never incremented — a replayed request
then cannot make it drift. `IP_SALT` is what makes the digest useless outside
this deployment; it is deliberately not `JWT_SECRET`, whose rotation is meant to
end sessions and should not also wipe every like. Missing salt is a 500, never
an unthrottled write.

`/api/shares` has no free-text field, so it skips the honeypot and the timing
check — a crawler User-Agent (`_lib/audience.ts`) gets the same quiet 201 the
other two guards give, and the same sliding window applies, just wider (twenty
per quarter hour, since sharing several avis in a row is ordinary reader
behaviour, not a flood).

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
at once. `IP_SALT` is the third secret — see the public-write rules above.

Known gap, and it is only about **sign-in**: no application-level rate limit
there, just a 250ms delay on failure, because the runtime cannot count between
requests and the login path has no database read to piggyback on. The real limit
is a WAF rule on `/api/login`, configured in the dashboard. The *comment*
endpoint does count, in `rate_hits` — D1 is not stateless — which is also what
makes it testable.

**The D1 database** (`DB` binding, `wrangler.toml`) holds the whole site.
`migrations/0000_socle.sql` is the probe `GET /api/db-health` reads (200 wired and
migrated, 503 not migrated, 500 no binding at all); `migrations/0001_contenu.sql`
is the content schema, `migrations/0002_ecriture.sql` adds moderation, the likes
registry and the rate limiter, and `migrations/0003_audience.sql` adds the
audience events (`view_hits`, `share_hits`) the dashboard now reads. Its
decisions, worth knowing before changing a query:

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
- `view_hits`/`share_hits` are append-only, on the shape of `rate_hits` but
  without an `ip_hash`: a view is a plain counted hit, not deduplicated per
  visitor, and — unlike `rate_hits` — never purged, since the trend needs
  twelve months of history. `articles.views`/`bilans.views` stay the fast
  running counter the leaderboard sorts by; `view_hits` exists only so the
  dashboard can bucket views by time. Recorded for neither a crawler UA nor
  the signed-in editor's own reads of the page they just published
  (`isCrawler`/`isAdminCaller` in `functions/_lib/audience.ts` and
  `_lib/admin.ts`) — the second of which is why `useArticleView`/
  `useBilanView` opportunistically send the admin bearer token on an
  otherwise-public route.

Local data lives in `.wrangler/state/v3` (gitignored), and `getPlatformProxy()`
persists to that same directory — so `npm run dev` and `npm run preview:cf` share
**one** SQLite file. Run `npm run db:migrate` after cloning, then
`npm run db:example` for something to look at.

Inserting content by hand: `npm run db:sql` passes the whole statement to the
shell as one argument, and a French apostrophe has to be doubled for SQL *and*
protected from the shell. Use a `.sql` file and `--file` instead — see
`examples/contenu-exemple.sql`, whose header spells out both traps.

**Images live in R2** (`MEDIA` binding, bucket `clap-chapitre-media`).
`POST /api/admin/uploads` takes the raw bytes with their own `content-type` — no
multipart — checks the type against a closed list (SVG is excluded: it is a
script host) and the size against 5 MB, then stores the file under
`<kind>-<sha256>.<ext>`. Keys are **content-addressed and flat**: flat because
`vite/routeMatch.ts` matches segments and a `covers/` prefix would need a
catch-all; content-addressed because it makes an object immutable, which is what
lets `/api/media/:key` cache for a year. Replacing an image yields a new key and
sweeps the old one up — unless another row still points at it, since two avis
given the same file share one object. `getPlatformProxy()` simulates the bucket
locally, so `npm run dev` needs no Cloudflare account; remotely it must exist
first (`npx wrangler r2 bucket create clap-chapitre-media`).

Remotely there is a **single** database, `clap-chapitre`, and a single bucket;
preview deployments inherit the top-level bindings. **This is now a live
problem, not a future one**: previews used to only read production, but every
route above writes — a preview branch will create, edit and delete production
content, and upload into the production bucket. Declaring
`[[env.preview.d1_databases]]` and `[[env.preview.r2_buckets]]` is overdue.
Pages never applies migrations on deploy, so a schema change means running
`npm run db:migrate:remote` by hand.

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
  scaffold, `ar*` = archives, `al*` = auth/login, `db*` = database, `wr*` =
  writes). Match the existing prefix when adding tests.
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
- Covers/portraits are **R2 object keys**, and `''` means "no image yet". They
  were CSS gradient strings while nothing could upload a file. Never paint one
  by hand: `coverStyle()` in `src/api/mutations.ts` builds the background *and*
  its framing, so a new tile cannot get `background-image` without
  `background-size`. The empty string falls through to each tile's own neutral
  placeholder.
