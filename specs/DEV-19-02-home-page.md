# DEV-19-02 — Home / main page (page principale)

**Linear:** DEV-19 · **Subtask:** 02 · **Recipe:** module · **Direction:** Salon (1a)
**Depends on:** DEV-19-01 (scaffold, tokens, `<Layout>`, `Article`/`Medium` types, routes)

Build the responsive Salon home feed that renders at `/` — and, per the owner's
routing decision, at `/films`, `/series`, `/livres`, `/docs` as the same feed
filtered to one medium. Static mock content only; no backend, no real data.

Authoritative design: `.claude/work/DEV-19/design-reference.md` plus the Salon
feed screen (`#1a`, desktop) and the mobile feed (`#3a`) in
`.claude/work/DEV-19/handoff/clap-chapitre/project/Clap et chapitre - Hifi.dc.html`.
Read both before implementing.

The scaffold already wires `/`, `/films`, `/series`, `/livres`, `/docs` →
`HomePage` and gives `HomePage` the active `Medium` from the route
(`src/pages/Home/index.tsx`). This subtask replaces that placeholder body with the
real feed and its filtering.

## Layout of the page (top → bottom, matches design `#1a`)
1. **Hero — "Dernier avis" (latest review).** Eyebrow `Dernier avis · <Medium> · <date>`,
   then a two-column block: cover art (gradient placeholder, `2/3` on desktop,
   `3/2` on mobile) + title (serif H1), an italic *hook* question, a plain-text
   excerpt, a `Pour ceux qui…` callout box (italic), and an action row:
   `Lire l'avis` button → `/article/:id`, `♡ <likes>`, `<comments>` comment count.
2. **"Avis récents" section header.** Serif label + hairline rule + `Tout voir` link.
3. **Recent grid.** The remaining reviews as cards: cover (`3/4`, title overlaid),
   colored medium label, serif title, one-line excerpt, `♡ likes · N commentaires`
   meta. 3 columns on desktop; stacked horizontal rows (74px thumbnail) on mobile.
4. **Newsletter band — "Le courrier du mois".** Dark-gradient block with copy,
   an email input and an `S'abonner` button. Presentational only.

## Data contract

The Salon feed needs presentational fields the shared `Article` type does not yet
carry (a hook line, the "Pour ceux qui…" line, like/comment counts). These are
real properties of every review and are reused by Bilan (04) and Archives (05),
so — per owner decision — they are added **directly to the shared `Article`
type** (`src/mock/types.ts`), not a home-local view type.

```ts
// src/mock/types.ts — Article gains:
export interface Article {
  // …existing: id, title, medium, excerpt, cover, date, author, body?
  likes: number;         // ♡ count
  comments: number;      // comment count
  hook?: string;         // italic question under the title (hero uses it)
  forThoseWho?: string;  // the "Pour ceux qui…" one-liner (hero uses it)
}
```

`likes`/`comments` are required (every card shows them); `hook`/`forThoseWho`
are optional (only the hero renders them). Components must tolerate their absence.

```ts
// src/mock/home.ts
import type { Article, Medium } from './types';

/** All mock reviews, newest first, media mixed. Author: Marie-Zoé. */
export const feed: Article[];

/** The hero item for a page: newest overall, or newest of `medium`. */
export function latestFor(medium?: Medium): Article | undefined;

/** The grid items for a page: the rest, filtered to `medium` when set. */
export function recentFor(medium?: Medium): Article[];
```

- `feed` MUST contain ≥ 1 item for **each** of `film | serie | livre | doc` so
  every medium route has a hero, and enough total items that `/` shows a hero +
  a ≥ 3-card grid. Reuse the design's sample titles (*Un dernier été* film,
  *L'année de la pluie* livre, *Les nuits blanches* série, *Fragments* docs).
  Hero items carry `hook` + `forThoseWho`; every item carries `likes`/`comments`.
- `cover` holds a CSS gradient string (e.g. `linear-gradient(150deg,#c56a3f,#8f3f24)`);
  no network image requests.
- `latestFor(undefined)` = `feed[0]`; `latestFor(m)` = first item whose `medium === m`.
- `recentFor(undefined)` = `feed` minus the hero; `recentFor(m)` = items of that
  medium minus that medium's hero. Selectors are pure (no React, no globals).

## User-visible behavior
- **`/`** renders the full mixed feed: hero = newest review, grid = the rest,
  then the newsletter band — inside the shared `<Layout>`.
- **`/films` `/series` `/livres` `/docs`** render the same page filtered to that
  medium: hero and grid show only that medium's items, and the active medium is
  reflected (eyebrow/section context). The medium comes from the route (already
  resolved by the scaffold), not in-page state.
- A **medium tab strip** (Films · Séries · Livres · Docs, active item marked)
  lives in the shared `<Header>` (subtask-01 file, edited here per owner decision),
  matching the mobile design's persistent tab row below the top bar. It reuses
  `primaryNav`, is shown on mobile only (the desktop left rail already carries the
  medium nav, so the strip is hidden ≥ desktop), and its active tab reflects the
  current route via `NavLink`. Home itself renders no medium navigation.
- `Lire l'avis` and each card link to `/article/:id`, which renders the subtask-01
  placeholder for now (valid route, no dead links).
- Fully responsive: 3-col grid and side-by-side hero on desktop; single-column
  hero and stacked horizontal grid rows on mobile, using the token breakpoints.
- All colors, fonts, radii, spacing come from `src/styles/tokens.css` — no raw
  Salon hex values in components.

## Failure modes
- **Medium with no items** (defensive; mock guarantees ≥ 1 each): render a Salon
  empty state ("Aucun avis pour ce médium pour l'instant.") instead of a broken
  hero — never index `feed[0]` blindly.
- **Newsletter form** has no submit target: the button/`<form>` must not navigate,
  reload, or throw (prevent default / inert); no console errors.
- **Missing optional `body`**: home never reads `body`; absence must not crash.
- **Unknown medium value** on the resolved route: treated as no filter → the full
  `/` feed, not an error.

## Out of scope
- The real `/article/:id` view and any content behind `Lire l'avis` (subtask 03,
  owner designs the article view first).
- A functional newsletter subscription (no backend, no validation beyond inert).
- Real data, API calls, or network image loading.
- Bilan culturel, Archives, À propos, Me suivre pages (subtasks 04–07).
- Gazette (1b) styling.

## Touches subtask-01 files (owner-approved)
This subtask edits two files the scaffold owns, by owner decision:
- `src/mock/types.ts` — add `likes`, `comments`, `hook?`, `forThoseWho?` to `Article`.
- `src/components/layout/Header.tsx` (+ `Layout.module.css`) — add the mobile
  medium tab strip. Existing subtask-01 behavior and tests must keep passing.

## Open questions
_None — both resolved by owner (2026-07-19): fields go on the shared `Article`
type; the medium tab strip lives in `<Header>`._
