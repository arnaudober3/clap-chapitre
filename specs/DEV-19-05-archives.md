# DEV-19-05 — Archives page (Archive par année)

**Linear:** DEV-19 · **Subtask:** 05 · **Recipe:** module · **Direction:** Salon (design `2b`)
**Depends on:** DEV-19-01 (scaffold, tokens, `<Layout>`, `Article`/`Medium` types, `/archives` route)
**Coordinates with:** DEV-19-04 (Bilan culturel) — shares the bilan mock model.

Build the responsive Salon **Archives** page at `/archives` — the index of every
monthly *Bilan culturel*, grouped by year: the current year expanded as a grid of
month cards, older years collapsed. Static mock content only; no backend.

Authoritative design: the Salon Archive screen (`#2b`, desktop) and the mobile
archive (`#3a`, "PHONE: ARCHIVE") in
`.claude/work/DEV-19/handoff/clap-chapitre/project/Clap et chapitre - Hifi.dc.html`,
plus `.claude/work/DEV-19/design-reference.md`. Read them before implementing.

## Decision: new page, reuse primitives + data — not Home's card
Archives is its **own page** (`src/pages/Archives/**`). It does **not** reuse
Home's review card: an archive card represents an aggregate *month of bilans*
(collage of covers + count), not a single `Article`, and links into a bilan, not
an article. What it **does** share:
- **Data** with Bilan (04): a single mock model `src/mock/bilans.ts`
  (`year → months → avis`) feeds both pages.
- **Primitives**: a small shared UI layer (`src/components/ui/**`) — a responsive
  `CardGrid` (3-col, hover-lift), a gradient `PosterThumb`, and the
  section/hairline header — usable by Home, Bilan and Archives. Retrofitting Home
  onto these primitives is an optional follow-up, **out of scope here**.

## Layout of the page (top → bottom, matches design `#2b`)
1. **Back link** `‹ Revenir au dernier bilan` → the latest bilan.
2. **Eyebrow** `Bilan culturel` (uppercase, `--accent`) + **H1** `Tous les bilans` (serif).
3. **Current year, expanded.** A year header row (`<year>` serif + `N bilans` count
   + `▾`, `2px --ink` bottom border), then a **grid of month cards**:
   - a bordered `--surface` card (radius, hairline border, card shadow) whose top is
     a row of **3 mini poster thumbnails** (`2/3`, gradient `cover`s from that
     month's avis), and whose body is the **month name** (serif) + an optional
     **"dernier"** pill (`--accent` bg, cream text) on the most recent month +
     a `N avis` count.
   - each card links to that month's bilan.
4. **Older years, collapsed.** One clickable row per older year (`<year>` in
   `--muted-2` + `N bilans` + `▸`, hairline top border). Clicking a collapsed year
   expands it into its own month-card grid; clicking an expanded year collapses it.

## Data contract — `src/mock/bilans.ts` (shared with subtask 04)

```ts
import type { Article } from './types';

export interface MonthlyBilan {
  id: string;          // 'YYYY-MM', e.g. '2026-06'
  year: number;        // 2026
  month: number;       // 1–12
  monthLabel: string;  // 'Juin'
  mood?: string;       // "l'humeur du mois" — used by Bilan (04); optional here
  avis: Article[];     // the month's reviews (grouped by medium on the Bilan page)
}

/** All monthly bilans, newest-first. */
export const bilans: MonthlyBilan[];

/** Bilans grouped by year, years descending, months within a year descending. */
export function bilansByYear(): Array<{ year: number; months: MonthlyBilan[] }>;

/** The most recent bilan (its month gets the "dernier" badge; back link target). */
export function latestBilan(): MonthlyBilan;
```

- `bilans` MUST cover **at least two years** so one year renders expanded and ≥ 1
  renders collapsed; the current year has ≥ 3 months so the grid is meaningful.
  Reuse the design's sample avis/titles and author **Marie-Zoé**.
- An archive card derives from a `MonthlyBilan`: `monthLabel`, `avis.length` for
  the count, and the first up-to-3 `avis[].cover` gradients for the collage.
- Covers are CSS gradient strings; no network image requests.
- Selectors are pure (no React, no module-level mutable state).

## User-visible behavior
- **`/archives`** renders inside the shared `<Layout>`: back link, header, the
  current year expanded as a month-card grid, then older years as collapsed rows.
- **Expand/collapse** of a year is local React state; the current (newest) year
  starts expanded, older years start collapsed. Toggling is keyboard-accessible
  (the year row is a real `button`, `aria-expanded` reflects state).
- Each **month card** links to that month's bilan. Until subtask 04 defines the
  per-month deep-link, cards link to `/bilan-culturel` (existing route; no dead
  links); the exact month param is a coordination item with 04 (see open questions).
- Fully responsive (design `#3a`): month grid is **3 columns on desktop, 2 on
  mobile**; year rows stay full-width. Uses token breakpoints.
- All colors, fonts, radii, spacing come from tokens — no raw Salon hex in components.

## Failure modes
- **A year with zero months** (defensive): render the year row with `0 bilans` and
  no grid, never crash; empty `bilans` renders the header + a Salon empty state
  ("Aucun bilan archivé pour l'instant.").
- **A month with fewer than 3 avis**: the collage shows only the covers available
  (1–2 thumbnails), never a broken/blank tile.
- **`latestBilan()` on empty data**: guarded — the back link is omitted rather than
  linking to `undefined`.
- Covers are gradients → offline-safe, no network image loads.

## Out of scope
- The Bilan culturel page itself (subtask 04) — Archives only links into it.
- The real per-month bilan deep-link/route shape (owned by subtask 04).
- Real data, API calls, or network image loading.
- Retrofitting Home (subtask 02) onto the new shared `src/components/ui` primitives
  (optional later refactor).
- The real `/article/:id` view; Gazette (1b) styling.

## Touches / introduces shared files
- **New** `src/mock/bilans.ts` and `src/components/ui/**` — shared with/available to
  subtask 04. Keep them medium-agnostic and page-agnostic.
- Does **not** modify `Article`/`Medium` or `<Layout>`/`<Header>`.

## Open questions
1. **Per-month deep-link.** Subtask 04 owns the Bilan route/month-selection shape
   (`/bilan-culturel/:id`? `?mois=YYYY-MM`?). Archives links to `/bilan-culturel`
   until that's fixed. *Owner: arnaud.ober3@gmail.com — decide with subtask 04.*
2. **Shared model ownership.** `src/mock/bilans.ts` is introduced here but consumed
   by 04; confirm 04 builds against this shape rather than a separate `bilan.ts`.
   *Owner: arnaud.ober3@gmail.com.*
