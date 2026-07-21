# DEV-19-07 — Me suivre page

**Linear:** DEV-19 · **Subtask:** 07 · **Recipe:** module · **Direction:** Salon (design `3c`)
**Depends on:** DEV-19-01 (scaffold, `src/styles/tokens.css`, `<Layout>`, `/me-suivre` route)
· DEV-19-06 (links here from the À propos follow CTA — no code dependency)

Build the responsive Salon **Me suivre** page at `/me-suivre` — the "where to find me"
page: an eyebrow + H1 + standfirst intro, a featured **newsletter** block, and a
**2×2 socials grid** (Threads · Letterboxd · Babelio · LinkedIn). Static mock content
only; no backend, no signup, no analytics.

Authoritative design: the Salon **Me suivre** screen (`#3c`, desktop) and the phone
**ME SUIVRE** frame (inside `#3a`) in
`.claude/work/DEV-19/handoff/clap-chapitre/project/Clap et chapitre - Hifi.dc.html`,
plus `.claude/work/DEV-19/design-reference.md`. Read them before implementing.

**Route already exists.** `App.tsx` wires `/me-suivre` → `MeSuivrePage`; this subtask
replaces the placeholder `src/pages/MeSuivre/index.tsx` and makes **no route-table change**.

## Data contract — `src/mock/mesuivre.ts` (new, owned by this subtask)

A single static content module. Pure data + pure types: no React, no module-level
mutable state, no network, no `Date`/random. Content is French, author **Marie-Zoé**,
lifted verbatim from design `3c` (desktop copy is the source of truth; the phone
frame is the same text shortened and drives only the responsive copy swap — which we
do **not** implement: one copy, one string).

```ts
/** The four social platforms of design 3c, in display order. */
export type SocialKey = 'threads' | 'letterboxd' | 'babelio' | 'linkedin';

/** One card of the socials grid. */
export interface SocialLink {
  key: SocialKey;
  /** Card title, e.g. 'Letterboxd'. */
  name: string;
  /** Handle + one-liner shown under the name, e.g. '@mariezoe · tous mes films'. */
  handle: string;
  /** The single glyph shown in the rounded swatch: '@' | '▶' | 'B' | 'in'. */
  glyph: string;
  /** Absolute external profile URL (opens in a new tab). */
  url: string;
  /** Right-hand call to action label, e.g. 'Suivre'. */
  cta: string;
}

export interface NewsletterFeature {
  /** Gold uppercase eyebrow: 'La newsletter'. */
  eyebrow: string;
  /** Serif cream title: 'Le courrier du mois'. */
  title: string;
  /** Muted cream copy under the title. */
  copy: string;
  /** Email input placeholder: 'votre@email.fr'. */
  placeholder: string;
  /** Submit button label: 'S’abonner'. */
  cta: string;
}

export interface MeSuivreContent {
  /** Uppercase --accent eyebrow: 'Me suivre'. */
  eyebrow: string;
  /** H1: 'On garde le contact'. */
  title: string;
  /** Serif --muted standfirst (max-width 56ch). */
  intro: string;
  newsletter: NewsletterFeature;
  socials: SocialLink[];
}

/** The page's static content. */
export const meSuivre: MeSuivreContent;
```

Fixed values (from design `3c`):
- `eyebrow` `'Me suivre'`; `title` `'On garde le contact'`;
  `intro` `'Choisissez votre endroit préféré — je poste au fil de l’eau sur les réseaux, et je résume tout une fois par mois dans la newsletter.'`
- `newsletter` = `{ eyebrow: 'La newsletter', title: 'Le courrier du mois', copy: 'Le bilan complet, les coups de cœur et une reco rien que pour vous. Une fois par mois, jamais plus.', placeholder: 'votre@email.fr', cta: 'S’abonner' }`
- `socials` = exactly four, in this order:

  | key | name | handle | glyph | swatch token |
  |-----|------|--------|-------|--------------|
  | `threads` | Threads | `@mariezoe · réactions à chaud` | `@` | `--social-threads` `#221a14` |
  | `letterboxd` | Letterboxd | `@mariezoe · tous mes films` | `▶` | `--social-letterboxd` `#2b6a4a` |
  | `babelio` | Babelio | `@mariezoe · ma bibliothèque` | `B` | `--social-babelio` `#9a3b2a` |
  | `linkedin` | LinkedIn | `Marie-Zoé · le côté pro` | `in` | `--social-linkedin` `#1f5079` |

  Each `cta` is `'Suivre'`. `url` values are **mock external profile URLs** built from
  the handle (`https://www.threads.net/@mariezoe`, `https://letterboxd.com/mariezoe/`,
  `https://www.babelio.com/monprofil.php`, `https://www.linkedin.com/in/mariezoe/`) —
  placeholders until the owner supplies the real profiles (open question 1). They must
  be absolute `https:` URLs, never `#`.

## User-visible behavior

`/me-suivre` renders inside the shared `<Layout>` (`<main>` outlet), top → bottom:

1. **Page head** — the uppercase `--accent` eyebrow `Me suivre`, the serif `<h1>`
   `On garde le contact` (`40px`, `line-height 1.05`), then the serif `--muted` intro
   paragraph capped at `56ch`.
2. **Newsletter feature** — a `--dark-grad` card (`radius 16px`, padding `30px 32px`),
   desktop: two columns side by side with `gap 26px`. Left: gold uppercase eyebrow
   `La newsletter`, serif cream (`--bg`) title `Le courrier du mois` (`26px`), muted
   cream copy (`--surface-alt`, `max-width 44ch`). Right (`280px`, `flex:none`): a real
   `<input type="email">` pill (cream `--bg` background, `--faint` placeholder,
   `aria-label="Adresse e-mail"`) above a full-width gold pill **submit button**
   `S’abonner` (`--gold`, `--gold-hover` on hover).
   The form is **inert**: `onSubmit` calls `preventDefault()` — no navigation, no
   reload, no request, no success message. Same contract as Home's `Newsletter`.
3. **Socials grid** — a 2-column grid (`gap 18px`) of four cards, one per
   `socials` entry. Each card is a single `<a>` (the whole card is the link) with
   `--bg` background, `1px solid --border`, `radius 14px`, padding `20px 22px`,
   laid out as: a `48px` rounded (`13px`) swatch filled with that platform's token
   colour showing the serif `glyph` in cream · a flex-1 block with the bold `name`
   (`16px`, `--ink`) over the `--faint` `handle` (`12.5px`) · the `--accent` semi-bold
   `cta` (`Suivre`) on the right.
   Cards link **externally**: `href={url}` with `target="_blank"` and
   `rel="noopener noreferrer"` — these are plain `<a>` tags, **not** react-router
   `Link`s (they leave the app). Hover: `border-color: var(--accent)` and
   `translateY(-3px)`, matching the design.
4. The page keeps `data-testid="me-suivre-page"` so the existing routing test
   (`src/test/sc5-routing.test.tsx`) keeps passing.

**Responsive (phone frame in `#3a`):** below the `md` breakpoint (768px) the newsletter
feature stacks to **one column** (copy block above the input + button, both full width)
and the socials grid collapses to a **single column** with `gap 12px`. Type steps down
per the phone frame: H1 `40px → 30px`, intro `18px → 15px`, newsletter title
`26px → 22px`, social swatch `48px → 42px` (glyph `22px → 19px`, `in` one step
smaller), social name `16px → 15px`, handle `12.5px → 12px`. Card padding steps to
`15px 16px`, newsletter padding to `22px`. Uses the token breakpoint literals
(`480/768/1024`) already used by the other pages.

All colors, fonts, radii, spacing come from `src/styles/tokens.css` via `var(--…)`.
**No raw Salon or brand hex** in the page components or their CSS module: the four
social swatch colours are added to `tokens.css` as tokens (mirroring the
`--portrait-grad` precedent from subtask 06). Dark-card muted copy reuses
`--surface-alt`, as Home's newsletter band already does — no new token for it.

## Failure modes
- **Inert form.** Submitting (button click or Enter in the input) never navigates,
  reloads, or throws; `preventDefault()` is always called. An empty or malformed
  email is accepted silently — there is no validation, no error state, no success
  state to assert.
- **`socials: []`** renders the head and newsletter with an empty grid and never
  throws; a missing/empty `glyph` renders an empty swatch, not a crash.
- **A social entry with a non-`https:` or empty `url`** must not render as a live
  link to `#` — the mock ships absolute URLs, and the tests assert every `href`
  starts with `https://`.
- **External links are safe**: every social `<a target="_blank">` carries
  `rel="noopener noreferrer"`. No `dangerouslySetInnerHTML` anywhere on the page.
- **No network at render**: no `<img>`, no `url(...)`, no fetch. Swatches are solid
  token colours with a text glyph, so the page renders identically offline.
- Duplicate `key` values in `socials` would break React list keys — the mock ships
  four distinct keys and a test asserts uniqueness.

## Out of scope
- Any real newsletter signup: backend, API, validation, double opt-in, persistence,
  success/error UI. The form stays inert.
- Changing the copy, layout or visual result of Home / À propos while extracting the
  shared block (see below) — that extraction is a **pure refactor**.
- Real social profile URLs, brand SVG/icon assets, or an icon library — the glyphs
  are text characters in a token-coloured swatch.
- Share/analytics tracking, follower counts, or live social feeds.
- Real data, API calls, CMS, i18n.
- Changes to `App.tsx` / the route table, `<Layout>` / `<Header>`, `src/mock/types.ts`,
  `src/mock/bilans.ts`, or `src/mock/apropos.ts`. The shared-block extraction adds
  **one** new primitive to `src/components/ui/**`; no existing primitive is touched.
- Gazette (1b) styling.

## Shared newsletter block (owner decision, 2026-07-21)

The Salon `--dark-grad` card now appears three times with the same chrome and three
different layouts:

| Call site | Design | Layout | Action |
|-----------|--------|--------|--------|
| `src/pages/Home/Newsletter.tsx` | `1a` | centred band, `max-width 520px`, inline form | inert submit |
| `src/pages/MeSuivre/NewsletterFeature.tsx` | `3c` | two columns, copy left / form right (`280px`) | inert submit |
| `src/pages/APropos/FollowCard.tsx` | `3b` | compact aside card | react-router `Link` to `/me-suivre` |

Once this page works, that chrome is extracted **once** into
`src/components/ui/NewsletterBlock.tsx` (exported from `src/components/ui/index.ts`),
with a `variant` prop — `'band' | 'feature' | 'compact'` — carrying the three layouts,
and content passed in as props (`eyebrow?`, `title`, `copy`, `cta`, plus `placeholder`
for the form variants and `to` for `'compact'`). The component holds **no mock data**
and imports nothing from `src/mock`. All three call sites become thin wrappers and
their duplicated CSS is deleted from the page modules.

This is a **pure refactor**: no route, data-contract, token or visual change, and the
existing tests (`home-components`, `ap3-apropos-aside`, `ap4-apropos-page`,
`ms2-newsletter-feature`, `ms4-mesuivre-page`) must keep passing unchanged. It runs
**last** — build `3c`'s block locally first, then generalise from three working call
sites rather than guessing the abstraction up front.

## Touches / introduces shared files
- **New:** `src/mock/mesuivre.ts` (owned here), `src/pages/MeSuivre/MeSuivre.module.css`,
  `src/pages/MeSuivre/NewsletterFeature.tsx`, `src/pages/MeSuivre/SocialCard.tsx`,
  `src/pages/MeSuivre/SocialGrid.tsx`; **replaces** `src/pages/MeSuivre/index.tsx`.
- **Modifies:** `src/styles/tokens.css` — **additive only**, four new social swatch
  tokens. No existing token value changes.
- **Reads:** `<Layout>` — unchanged. The existing `src/components/ui` primitives are not
  a fit for `3c` (no card grid of posters, no section rule); do not modify them.
- **Adds (final task only):** `src/components/ui/NewsletterBlock.tsx` + its export in
  `src/components/ui/index.ts` and rules in `ui.module.css`; rewrites
  `src/pages/Home/Newsletter.tsx` and `src/pages/APropos/FollowCard.tsx` as wrappers
  and deletes their now-duplicated CSS.

## Open questions
1. **Real social URLs.** The design links every card to `#3c`. The spec ships plausible
   placeholder profile URLs. If the owner has the real Threads/Letterboxd/Babelio/LinkedIn
   profiles, they should be dropped into `src/mock/mesuivre.ts`. **Owner:** arnaud.ober3@gmail.com.
2. ~~**Two newsletter blocks on the site.**~~ **RESOLVED (2026-07-21):** the owner wants
   the block shared. Added as the final task of this subtask — see *Shared newsletter
   block* above.
