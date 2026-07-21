# DEV-19-06 — À propos page

**Linear:** DEV-19 · **Subtask:** 06 · **Recipe:** module · **Direction:** Salon (design `3b`)
**Depends on:** DEV-19-01 (scaffold, `src/styles/tokens.css`, `<Layout>`, `/a-propos` route)
· DEV-19-05 (shared `src/components/ui/**` primitives — `SectionHeader` already exists)

Build the responsive Salon **À propos** page at `/a-propos` — who is behind the site:
a portrait hero band, the bio prose + pull-quote, a "Cette année" stats panel and a
"On se suit ?" follow CTA. Static mock content only; no backend, no real data.

Authoritative design: the Salon **À propos** screen (`#3b`, desktop) and the phone
**À PROPOS** frame (inside `#3a`) in
`.claude/work/DEV-19/handoff/clap-chapitre/project/Clap et chapitre - Hifi.dc.html`,
plus `.claude/work/DEV-19/design-reference.md`. Read them before implementing.

**Route already exists.** `App.tsx` wires `/a-propos` → `AProposPage`; this subtask
replaces the placeholder `src/pages/APropos/index.tsx` and makes **no route-table change**.

## Data contract — `src/mock/apropos.ts` (new, owned by this subtask)

A single static content module. Pure data + pure selectors: no React, no
module-level mutable state, no network. Content is French, author **Marie-Zoé**,
lifted verbatim from design `3b` (desktop copy; the phone frame is a truncation of
the same text, so desktop copy is the source of truth).

```ts
/** One row of the "Cette année" panel. */
export interface YearStat {
  /** Row label, e.g. 'Films & séries'. */
  label: string;
  /** The number shown in serif --accent, e.g. 63. */
  value: number;
}

export interface AProposContent {
  /** Uppercase --accent eyebrow: 'À propos'. */
  eyebrow: string;
  /** H1, split so the name can be italic --accent: 'Bonjour, moi c’est' + 'Marie-Zoé'. */
  greeting: string;
  name: string;
  /** Serif --muted standfirst under the H1. */
  intro: string;
  /** Alt/label for the portrait placeholder (no image file). */
  portraitLabel: string;
  /** Bio paragraphs, in order. Each may contain <b>-worthy emphasis — see `bioEmphasis`. */
  bio: string[];
  /** Substrings inside `bio` rendered semi-bold (e.g. 'Clap et chapitre', 'bilan'). */
  bioEmphasis: string[];
  /** The gold-rule pull-quote (guillemets included). */
  quote: string;
  /** 'Cette année' panel: heading + rows. */
  statsTitle: string;
  stats: YearStat[];
  /** Dark follow CTA card. */
  follow: { title: string; copy: string; cta: string; to: string };
}

/** The page's static content. */
export const apropos: AProposContent;
```

Fixed values (from design `3b`):
- `eyebrow` `'À propos'`; `greeting` `'Bonjour, moi c’est'`; `name` `'Marie-Zoé'`.
- `stats` = `[{ 'Films & séries', 63 }, { 'Livres', 28 }, { 'Bilans publiés', 6 }]`,
  `statsTitle` `'Cette année'`. These are **static mock numbers**, not derived from
  `src/mock/bilans.ts` — deriving them is out of scope (see Out of scope).
- `follow` = `{ title: 'On se suit ?', copy: 'Le bilan du mois directement dans votre boîte mail.', cta: 'Me suivre →', to: '/me-suivre' }`.
- `bio` = the three paragraphs of `3b`; `quote` = « Une bonne histoire, c'est celle
  qu'on a envie de raconter à quelqu'un dès qu'elle est finie. »
- The portrait is a **CSS gradient placeholder** (`linear-gradient(150deg,#c9895a,#8f5230)`,
  exposed as a token) with the italic word "portrait" inside — **no image file, no
  network request**.

## User-visible behavior

`/a-propos` renders inside the shared `<Layout>` (`<main>` outlet), top → bottom:

1. **Hero band** — full-bleed within `<main>`, `linear-gradient(120deg, --surface, --surface-alt)`
   background with a `--border` bottom hairline. Left: a **170px round portrait**
   placeholder (gradient, soft shadow, italic "portrait" caption bottom-aligned).
   Right: the uppercase `--accent` eyebrow `À propos`, the serif **H1**
   `Bonjour, moi c’est <i>Marie-Zoé</i>` (the name italic + `--accent`), and the
   serif `--muted` intro paragraph (`max-width: 52ch`).
2. **Two-column body** (desktop, `gap ~44px`, padding `38px 48px 44px`):
   - **Main column** (`max-width: 560px`): the bio paragraphs in `--body`
     (`line-height 1.75`), with `Clap et chapitre` and `bilan` semi-bold; then the
     **pull-quote** — serif italic `--ink`, `3px solid --gold` left rule.
   - **Aside** (`250px`): the **"Cette année" panel** (a `--surface` card,
     `--border-2` border, card radius) listing each stat as a row — sans-serif
     `--nav-idle` label left, serif `--accent` number right, baseline-aligned,
     hairline separator between rows and **none after the last**; below it the
     **follow CTA card** (`--dark-grad` background, cream serif title `On se suit ?`,
     muted copy, and a gold pill link `Me suivre →` to `/me-suivre`).
3. The follow CTA is a real **react-router `Link`** to `/me-suivre` (route exists,
   currently the subtask-07 placeholder) — not an `<a href>`, not a dead link.
4. The page keeps `data-testid="a-propos-page"` so the existing routing test
   (`src/test/sc5-routing.test.tsx`) keeps passing.

**Responsive (phone frame in `#3a`):** below the `md` breakpoint the hero band
stacks and **centers** — portrait (118px) above the eyebrow/H1/intro, all
center-aligned — and the two columns collapse to **one column**: bio, pull-quote,
then the "Cette année" panel and follow CTA full-width beneath. Type scale steps
down per the phone frame (H1 `38px → 26px`, intro `18px → 15px`, body
`14.5px → 13.5px`, stat number `26px → 23px`). Uses the token breakpoint literals
(`480/768/1024`) already used by the other pages.

All colors, fonts, radii, spacing come from `src/styles/tokens.css` via `var(--…)`.
**No raw Salon hex** in the page components or its CSS module; the portrait gradient
is added to `tokens.css` as a token (e.g. `--portrait-grad`) rather than inlined.

## Failure modes
- **Empty or missing content arrays** (defensive): `bio: []` renders the hero and
  aside with no paragraphs and never throws; `stats: []` renders the "Cette année"
  panel heading with no rows (or omits the panel) rather than crashing.
- **A stat row with `value: 0`** renders `0`, not a blank — falsy values must not be
  swallowed by `&&` rendering.
- **`bioEmphasis` term absent from a paragraph**: the paragraph renders unchanged,
  no empty `<b>`, no crash. Emphasis splitting must not drop or duplicate text.
- **Emphasis rendering is escaped-safe**: bio text is rendered as React children
  (split on the emphasis substrings), never via `dangerouslySetInnerHTML`.
- **Portrait is a gradient** → offline-safe; no `<img>`, no `url()`, no broken image.
- The `/me-suivre` target is a placeholder page until subtask 07 — an intentional
  live link, not a failure.

## Out of scope
- The **Me suivre** page itself (subtask 07) — À propos only links to it.
- Deriving the "Cette année" numbers from `src/mock/bilans.ts` or any other real
  source; the stats are static mock numbers.
- A real portrait image, image pipeline, or asset loading.
- Any newsletter form on this page (the `3b` aside is a link-only CTA; the form
  lives on Home and on Me suivre).
- Real data, API calls, CMS, i18n.
- Changes to `App.tsx` / the route table, `<Layout>` / `<Header>`, `Article`/`Medium`
  types, or `src/mock/bilans.ts`.
- Retrofitting other pages onto anything introduced here; Gazette (1b) styling.

## Touches / introduces shared files
- **New:** `src/mock/apropos.ts` (owned here), `src/pages/APropos/APropos.module.css`,
  `src/pages/APropos/Hero.tsx`, `src/pages/APropos/YearStats.tsx`,
  `src/pages/APropos/FollowCard.tsx`; **replaces** `src/pages/APropos/index.tsx`.
- **Modifies:** `src/styles/tokens.css` — **additive only**, one new token for the
  portrait gradient. No existing token value changes.
- **Reads:** `<Layout>` and `src/components/ui` (`SectionHeader` where it fits) —
  unchanged.

## Open questions
1. **Stats source — assumed static.** The design shows `63 / 28 / 6` with no
   indication they are computed. Spec'd as static mock. If the owner wants them
   derived from `bilans.ts`, that is a follow-up. **Owner:** arnaud.ober3@gmail.com.
2. **Portrait asset.** Design uses a gradient placeholder captioned "portrait". If a
   real photo of Marie-Zoé should ship in the prototype, the owner must supply the
   file; otherwise the gradient stands. **Owner:** arnaud.ober3@gmail.com.
