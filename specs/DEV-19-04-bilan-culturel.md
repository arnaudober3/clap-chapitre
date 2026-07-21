# DEV-19-04 — Bilan culturel page (monthly review article)

**Linear:** DEV-19 · **Subtask:** 04 · **Recipe:** module · **Direction:** Salon (design `2a`)
**Depends on:** DEV-19-01 (scaffold, tokens, `<Layout>`, `Article`/`Medium`/`Comment` types, `/bilan-culturel` route)
**Coordinates with:** DEV-19-05 (Archives) — shares the `src/mock/bilans.ts` model. 05 is spec'd
but **not yet built**, so this subtask **creates** `src/mock/bilans.ts` against the DEV-19-05
contract verbatim; whichever subtask lands first owns the file, the other reuses it unchanged.

Build the responsive Salon **Bilan culturel** page at `/bilan-culturel` — the monthly review
"article": a month header + switcher, *l'humeur du mois*, the month's full reviews grouped by
medium, then the whole-bilan social bar and comment thread. Static mock content only; no backend.

Authoritative design: the Salon Bilan screen (`#2a`, desktop) and the mobile Bilan
(`#3a`, "PHONE: BILAN") in
`.claude/work/DEV-19/handoff/clap-chapitre/project/Clap et chapitre - Hifi.dc.html`,
plus `.claude/work/DEV-19/design-reference.md`. Read them before implementing.

The scaffold already wires `<Route path="/bilan-culturel" element={<BilanCulturelPage />} />`
and ships a placeholder body (`src/pages/BilanCulturel/index.tsx`). This subtask replaces the
placeholder with the real page. **No route table (App.tsx / subtask-01) change is needed** — the
month is selected via a query param on the existing route (see routing decision).

## Routing decision (subtask 04 owns this seam)
Month selection uses a **query param on the single existing route**:
`/bilan-culturel?mois=YYYY-MM` (e.g. `/bilan-culturel?mois=2026-06`). Bare `/bilan-culturel`
(no `mois`) shows the **latest** bilan. This resolves the open question 05 flagged: Archives
month cards deep-link to `/bilan-culturel?mois=<id>`; the `<Route>` table stays untouched.

## Data contract — `src/mock/bilans.ts` (shared with subtask 05, shape frozen by DEV-19-05)

The shared model is **exactly** the DEV-19-05 shape — do not renegotiate it (05 depends on it):

```ts
import type { Article } from './types';

export interface MonthlyBilan {
  id: string;          // 'YYYY-MM', e.g. '2026-06'
  year: number;        // 2026
  month: number;       // 1–12
  monthLabel: string;  // 'Juin'
  mood?: string;       // "l'humeur du mois" — rendered by this page
  avis: Article[];     // the month's reviews (this page groups them by medium)
}

/** All monthly bilans, newest-first. */
export const bilans: MonthlyBilan[];

/** Bilans grouped by year, years descending, months within a year descending (05). */
export function bilansByYear(): Array<{ year: number; months: MonthlyBilan[] }>;

/** The most recent bilan (default view; "dernier bilan" back-link target for 05). */
export function latestBilan(): MonthlyBilan;

/** Additive selector for this page: resolve a bilan by its 'YYYY-MM' id (undefined if none). */
export function bilanById(id: string): MonthlyBilan | undefined;
```

- `bilanById` is **additive** to the 05 contract (05 does not need it; adding it does not change
  the frozen shape). `bilans` / `bilansByYear` / `latestBilan` match DEV-19-05 exactly.
- `bilans` MUST cover **≥ 2 years** with the current year holding **≥ 3 months** (so DEV-19-05's
  Archives renders one expanded year + a collapsed year). Newest month is **Juin 2026** per design.
- Each `avis[]` reuses the design's sample titles/author **Marie-Zoé** and spans ≥ 2 media so the
  Bilan groups render. The **latest** month's avis carry full detail (`body`, `hook`, `forThoseWho`,
  `relatedTo`); older months may be lighter. Covers are CSS gradient strings — no network requests.
- Selectors are pure (no React, no module-level mutable state); the module is medium- and
  page-agnostic (grouping-by-medium is a page concern, not a selector).

### Shared `Article` gains one optional field (owner-approved subtask-01 edit, additive)
The Bilan review shows an "À rapprocher de" callout — a real per-review attribute. Per the
subtask-02 precedent (shared review fields live on `Article`), add it to `src/mock/types.ts`:

```ts
// src/mock/types.ts — Article gains:
relatedTo?: { title: string; note: string }; // "À rapprocher de" callout (Bilan uses it)
```

Optional; existing fields and all subtask-01/02 type usage/tests are unchanged. Home never reads it.

## Layout of the page (top → bottom, matches design `#2a`)
1. **Header + month switcher.** Eyebrow `Bilan culturel` (uppercase `--accent`), then an H1 =
   `<monthLabel> <year>` (serif, e.g. "Juin 2026") with a `▾` caret. Below: a `Mois précédents`
   label + a row of pills for other months (label e.g. "Mai 2026"), each linking to
   `?mois=<id>`, ending with a `Tous les bilans →` link to `/archives`.
2. **L'humeur du mois.** A `2px --ink` top rule, an `L'humeur du mois` eyebrow, and the month's
   `mood` as a serif lead paragraph. Omitted entirely when the month has no `mood`.
3. **Reviews grouped by medium.** For each medium present in the month (in a fixed order —
   Films · Séries · Livres · Docs), a section header (serif uppercase `--accent` label + hairline
   rule) followed by each review as a **BilanReview** block: gradient cover (`2/3`, title overlaid)
   beside the body — colored medium label, serif H2 title, italic `hook`, the `body` paragraphs,
   an optional `À rapprocher de` callout (gold left-border) and an optional `Pour ceux qui…` box
   (`forThoseWho`). Media with no avis this month render no section.
4. **Whole-bilan social bar.** `♡ J'aime · <n>` button, `<n> commentaires` count, `Partager` —
   presentational only (no navigation/network). Counts are page-local presentational values (the
   comment count derives from the thread length).
5. **Comment thread.** `Commentaires · <n>` heading, an **inert** comment composer (a
   "Votre commentaire…" field, a name field, a `Publier` button — never navigates/reloads/throws),
   then the thread: avatar + name + date + body + like/reply affordances, an author badge on
   Marie-Zoé's entries, and one nested reply. Thread content is **page-local** static mock using the
   shared `Comment` type — it is NOT added to the frozen `MonthlyBilan` model.

## User-visible behavior
- **`/bilan-culturel`** renders the **latest** bilan inside the shared `<Layout>`: header +
  switcher, humeur, medium-grouped reviews, social bar, comment thread.
- **`/bilan-culturel?mois=YYYY-MM`** renders that month's bilan; the H1, switcher active state,
  humeur and reviews all reflect the selected month. Month resolution reads `useSearchParams`.
- The **month switcher** pills link to sibling months via `?mois=<id>`; `Tous les bilans →` links
  to `/archives`. The currently-shown month is not offered as a pill.
- Reviews are **grouped by medium** in a fixed Films → Séries → Livres → Docs order; only media
  with avis this month appear. Within a medium, avis keep their mock order.
- The comment composer and social bar are **inert**: interacting with them does not navigate,
  reload, mutate, or throw, and logs no console error.
- Fully responsive (design `#3a`): desktop shows the cover beside the review text (`2/3`, ~150px);
  mobile stacks the cover full-width above the text (`3/2`) and the switcher pills wrap/scroll.
  Uses the token breakpoints.
- All colors, fonts, radii, spacing come from `src/styles/tokens.css` — no raw Salon hex in
  components or their CSS.

## Failure modes
- **Unknown / malformed `?mois`** (e.g. `?mois=2099-13` or garbage): fall back to the latest bilan —
  never a crash, blank page, or 404.
- **Empty `bilans`** (defensive): render the eyebrow + a Salon empty state
  ("Aucun bilan pour l'instant.") instead of dereferencing `latestBilan()`.
- **A month with no `mood`**: omit the humeur block; the page still renders.
- **A month whose avis are all one medium**: only that medium's section renders (no empty headers).
- **A review missing `body` / `hook` / `forThoseWho` / `relatedTo`**: omit just that element; never
  render a blank callout or throw.
- **Inert composer / social bar**: `preventDefault` on the form; buttons are non-navigating and
  non-throwing.
- Covers are CSS gradients → offline-safe, no network image loads.

## Out of scope
- The **Archives** page itself (subtask 05) — this page only links to `/archives` and shares
  `src/mock/bilans.ts`. Building the Archives UI and the DEV-19-05 `src/components/ui/**` primitives
  is out of scope here.
- A **functional** comment system, likes, or share (no backend, no persistence, no validation).
- The real `/article/:id` view (subtask 03) and Gazette (1b) styling.
- Real data, API calls, or network image loading.
- Retrofitting Home (02) or Archives (05) onto anything introduced here.

## Touches / introduces shared files
- **New** `src/mock/bilans.ts` — the model shared with subtask 05; keep it medium- and
  page-agnostic and matching the DEV-19-05 contract verbatim (plus the additive `bilanById`).
- **Owner-approved subtask-01 edit:** `src/mock/types.ts` gains optional `Article.relatedTo`
  (additive; subtask-01/02 tests stay green).
- Does **not** modify `<Layout>`/`<Header>` or the `App.tsx` route table.

## Open questions
_None. Routing shape resolved by owner (2026-07-19): `/bilan-culturel?mois=YYYY-MM`, single route.
Shared-model ownership resolved: 04 creates `src/mock/bilans.ts` against the frozen DEV-19-05
contract; 05 reuses it. `Article.relatedTo` added on the subtask-02 shared-field precedent._
