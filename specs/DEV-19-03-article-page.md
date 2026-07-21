# DEV-19-03 — Article page / single avis (`/article/:id`)

**Linear:** DEV-19 · **Subtask:** 03 · **Recipe:** module · **Direction:** Salon (design `4a` desktop, `4b` mobile)
**Depends on:** DEV-19-01 (scaffold, tokens, `<Layout>`, `Article`/`Comment` types, `/article/:id` route)
· DEV-19-02 (`src/mock/home.ts` feed) · DEV-19-04 (`src/mock/bilans.ts`) · DEV-19-05 (`src/components/ui/**`)
**Status note (2026-07-21):** the blocking open question is **RESOLVED** — the owner designed
the article view in Claude Design as turn **4 "Single avis (article) view"**, options **`4a`**
(desktop, 1200px) and **`4b`** (the same review on a 390px phone). `4a` and `4b` are *not*
alternatives: they are the desktop and mobile renderings of one page. Build both.
This subtask replaces the placeholder [src/pages/Article/index.tsx](../src/pages/Article/index.tsx);
the route is already wired in [App.tsx:23](../src/App.tsx#L23). No route-table change.

Build the responsive Salon **single avis** page at `/article/:id` — the page you land on
from a review card or the home hero's "Lire l'avis". Static mock content only; no backend.

Authoritative design: screens `#4a` and `#4b` in the Claude Design project
`https://claude.ai/design/p/ab31f5c0-a281-40b2-9e0d-e60bbb856d02?file=Clap+et+chapitre+-+Hifi.dc.html`
(read via the `claude_design` MCP: `read_file` on `Clap et chapitre - Hifi.dc.html`, section
`id="t4"`, roughly lines 36–265). ⚠ The local handoff copy at
`.claude/work/DEV-19/handoff/clap-chapitre/project/Clap et chapitre - Hifi.dc.html` was
exported on 2026-07-19 and **predates turn 4** — it contains no article screen. Pull the live
file (or rely on the distillation below + `.claude/work/DEV-19/design-reference.md`).

## Layout of the page (top → bottom, matches design `#4a`)
Standard rail `<Layout>`; the whole article lives in `<main>` (`padding 30px 56px 44px`),
with every text block constrained to a **660px reading column** (the hero spans full width).

1. **Breadcrumb** — `Bilan culturel › Juin 2026 › Films` (12px, `--faint`; first crumb
   `--accent` 600, second `--body`, last plain).
2. **Hero** — flex row, `gap 40px`: a **250px** `2/3` gradient cover (radius 13px, deep
   colored shadow, `Affiche` eyebrow top-left in white 70%, title bottom-left in serif 27px)
   next to: medium eyebrow (`Film`, 10px uppercase, medium accent) · dot · meta line
   (`Comédie dramatique · 2 h 04 · 2026`, 11.5px `--faint`); **H1** serif 46px/1.04
   `-.02em`; italic serif **hook** 20px `--muted`; then the byline row — 38px gradient
   avatar with `MZ` monogram, `par **Marie-Zoé**`, and `Publié le 2 juillet 2026 · 4 min de lecture`.
3. **Body** — first paragraph serif 17px/1.7 with a **62px `--accent` drop cap** on its
   first letter; following paragraphs sans 14.5px/1.8 `--body`.
4. **Pull quote** — mid-body, `3px --gold` left border, `padding-left 22px`, italic serif
   23px/1.4 `--ink`.
5. **À rapprocher de** — eyebrow (10px uppercase `--faint`) + a **2-column grid** of related
   cards: 52px `2/3` gradient thumb + medium label (its accent) + serif 16px title + an
   11.5px note (`Même façon de fouiller l'amitié qui vieillit.`). Hover: `--accent` border,
   `translateY(-2px)`.
6. **Pour ceux qui…** — `--surface` panel, `--border-2` hairline, radius 13px: `--accent`
   uppercase eyebrow + italic serif 17px verdict line.
7. **Social bar** — hairline top+bottom, `padding 16px 0`: `♡ J'aime · 24` pill
   (`--ink` bg, cream text, hover `--accent`), an `Enregistrer` text link, spacer, and a
   `Partager` outlined pill (`--border-pill`, hover `--accent`).
8. **Prev / next** — two equal cards, `‹ Avis précédent` / `Avis suivant ›` (10.5px
   `--faint`) over the neighbouring avis' serif title (right-aligned on the next card).
9. **Comments** — serif 22px `Commentaires · 3`; an inert composer card (`--surface`,
   comment field, name field `Nom — ou rester anonyme`, `Publier` pill); then the thread:
   36px avatars, name + date, body, `♡ n` / `Répondre` affordances, one **nested reply**
   (indented 36px, `autrice` `--accent` pill, no date), and an `Anonyme` entry with a `?`
   avatar on `--border`.

## Mobile (design `#4b`)
- Top bar `☰` + centered wordmark (shared `<Header>`), hairline bottom.
- **Cover band** replaces the desktop hero: a full-bleed band painted with the avis' cover
  gradient, holding a `‹ Juin 2026` back link (white 80%), a 104px poster thumb, the medium
  eyebrow and the serif 26px title **in white**.
- Below, on `--bg`: italic hook 16px, byline row (34px avatar, `2 juillet 2026 · 4 min`)
  closed by a hairline; body (drop cap 48px, paragraphs 13.5px/1.75); pull quote
  (17px, `padding-left 16px`); **À rapprocher de** stacked as full-width rows (42px thumbs);
  the `Pour ceux qui…` panel; a compact social row (`♡ 24`, a comment-count glyph `3`,
  `Partager`); then `Commentaires · 3` with 32px avatars.
- The composer moves to a **sticky bottom bar**: pill input `Votre commentaire…` + `Publier`.
- Prev/next and the `Enregistrer` link are **desktop-only** — mobile drops them.

## Data contract
### Additive fields on `Article` — `src/mock/types.ts` (shared, additive only)
All optional, so every existing mock and the Bilan/Home/Archives tests keep compiling:
```ts
/** Meta line under the medium label, e.g. "Comédie dramatique · 2 h 04 · 2026". */
genreMeta?: string;
/** Reading time, e.g. "4 min de lecture". */
readingTime?: string;
/** The mid-body pull quote (rendered with the gold rule). */
pullQuote?: string;
/** "À rapprocher de" — ids of up to 2 other avis + why they're close. */
related?: Array<{ id: string; note: string }>;
```
`body` (already declared) is the full essay, `\n\n`-separated paragraphs. The existing
single `relatedTo` field stays untouched — it belongs to the Bilan page.

### New module — `src/mock/articles.ts`
The article page must resolve an id coming from **either** source (home feed cards link to
`/article/<feed id>`; bilan avis carry their own ids), so this subtask introduces the
resolver — pure functions, no React, no mutable module state:
```ts
/** Every avis, deduped by id: the home feed first, then all bilan avis. */
export const articles: Article[];
export function articleById(id: string): Article | undefined;
/** Neighbours in `articles` order, for the prev/next cards. */
export function articleNeighbours(id: string): { prev?: Article; next?: Article };
/** Resolves `article.related` ids to Articles (silently drops unknown ids), max 2. */
export function relatedArticles(article: Article): Array<Article & { note: string }>;
/** The bilan an avis belongs to, for the breadcrumb — undefined for feed-only avis. */
export function bilanForArticle(id: string): MonthlyBilan | undefined;
```
- **Enrich [src/mock/home.ts](../src/mock/home.ts) additively**: at minimum `un-dernier-ete`
  (the design's exact avis) gets `genreMeta`, `readingTime`, `pullQuote`, `body` and two
  `related` entries pointing at `l-annee-de-la-pluie` (livre) and the série avis, so the
  page can be rendered pixel-close to `4a`/`4b`. Give the other feed items at least `body`.
  Do **not** reorder or rename existing entries — Home's tests depend on them.
- `src/mock/bilans.ts` is **read-only** here (04 owns it).

### Comments — page-local
`src/pages/Article/thread.ts` + `src/pages/Article/CommentThread.tsx`, mirroring the shape
of the Bilan versions (`ThreadEntry`, one nested `autrice` reply). The Bilan components are
**not** refactored into `src/components/ui` — `bc4-comment-thread.test.tsx` imports them by
path; promoting them is an optional later follow-up, out of scope here.

## User-visible behavior
- `/article/:id` renders the avis inside the shared `<Layout>`; **an unknown id renders the
  Salon not-found state** (reuse `NotFoundPage`'s treatment or an inline "Cet avis n'existe
  pas." with a link back to `/films`) — never a crash or a blank page.
- Breadcrumb is derived: if the avis belongs to a bilan → `Bilan culturel` (→
  `/bilan-culturel`) `› <MonthLabel> <year>` (→ `/bilan-culturel?mois=<bilan id>`) `›
  <MediumLabel>`; otherwise the first two crumbs collapse to the medium archive
  (`/archives/<segment>` via `MEDIUM_TO_SEGMENT` in [src/media.ts](../src/media.ts)).
- Prev/next link to the neighbouring ids; at the ends the missing card is **omitted**
  (the remaining one keeps its side), never rendered disabled or linking to `undefined`.
- Related cards link to `/article/<id>`; navigating between avis re-renders in place
  (scroll position resets to top).
- Everything social is **inert**: like/save/share/`Publier` and `Répondre` are real
  `<button>`s that do nothing (form `preventDefault`), no navigation, no persistence.
- Responsive per `4b`: the reading column, hero→cover-band swap and sticky composer switch
  at the token breakpoints; no horizontal scroll at 390px.
- All colors, fonts, radii and spacing come from `tokens.css` — no raw Salon hex in
  components. Covers stay CSS gradients (no network image requests).

## Failure modes
- **Unknown / malformed `:id`** → not-found state, as above.
- **Missing `body`** → fall back to rendering `excerpt` as the lead paragraph (still with
  the drop cap); the article never renders an empty column.
- **Missing `pullQuote` / `related` / `forThoseWho` / `genreMeta`** → those blocks are
  omitted entirely, not rendered empty.
- **`related` pointing at an unknown id** → that card is dropped silently.
- **Single-article dataset** → prev/next section disappears rather than self-linking.

## Out of scope
- Real data, an API, comment persistence, likes that count.
- Real poster images (gradients stay).
- Refactoring Bilan's `CommentThread` into the shared `ui` layer.
- Changing the route table, `<Layout>`, or `src/mock/bilans.ts`.
- Gazette (1b) styling.

## Touches / introduces shared files
- **New**: `src/pages/Article/**` (page, hero, body, related, social, thread), `src/mock/articles.ts`.
- **Additive edits**: `src/mock/types.ts` (four optional fields), `src/mock/home.ts` (fill in
  the new fields). Both must keep every existing test green.
- **Read-only**: `src/mock/bilans.ts`, `src/media.ts`, `src/components/ui/**`, `<Layout>`/`<Header>`.

## Open questions
_None._ The blocking question ("no hi-fi screen for the article view") is resolved by
turn 4 (`4a` + `4b`) in the Claude Design project, 2026-07-21.
