# DEV-19 — Design reference (extracted from Claude Design handoff)

Source: `.claude/work/DEV-19/handoff/clap-chapitre/project/Clap et chapitre - Hifi.dc.html`
(the file DEV-19 references; pulled via manual handoff export because the Claude
Design API login could not attach design scopes to the CLI token — see decomposition
open_questions). Wireframes: `Clap et chapitre - export.html`, `Bilan wireframes - export.html`,
`Feed Wireframes.dc.html`.

**Chosen visual direction: "Salon" (option 1a).** The design file carries it through
every page ("The winning 1a Salon world applied to the other two screens"). The
"Gazette" variant (1b — Playfair, oxblood #7a2222, ink #16120e) is a rejected
alternative and should NOT be built unless the owner reverses the decision.

## Design tokens (Salon) → `src/styles/tokens.css`

### Color
| Token | Value | Use |
|-------|-------|-----|
| `--bg` | `#fdf8f0` | page background (cream) |
| `--surface` | `#f6efe3` | rail, cards, panels, inputs |
| `--surface-alt` | `#f0e6d4` | hero-band gradient end |
| `--ink` | `#3f2e20` | primary text / active nav bg (dark brown) |
| `--body` | `#5c4a38` | body copy |
| `--muted` | `#8a6a4c` | italic subheads |
| `--muted-2` | `#8a7460` | secondary meta |
| `--faint` | `#a08a72` | metadata, input placeholder |
| `--accent` | `#b0502f` | eyebrows, the italic "et", links, active accent (terracotta) |
| `--gold` | `#d8a24a` | CTA buttons, underline mark, active dot |
| `--gold-hover` | `#e6b45f` | CTA hover |
| `--border` | `#e9dfce` | hairline borders/dividers |
| `--border-2` | `#ece1cf` | card borders |
| `--border-pill` | `#e0d4c0` | pill/chip borders |
| `--dark-grad` | `linear-gradient(120deg,#3f2e20,#5a4130)` | newsletter blocks |

Category accents (medium labels): Livre `#6a7a45`, Série `#4f6f7c`, Docs `#8a5a7a`, Film `#b0502f`.
Cover art = gradient placeholders (real posters drop in later), e.g.
film `linear-gradient(150deg,#c56a3f,#8f3f24)`, livre `…#7a8c5a,#4f6138`,
série `…#5a7a86,#37525f`, docs `…#9a6a8a,#5f3a55`.

### Typography (Google Fonts)
- **Newsreader** (serif, 400/500/600 + italic) — headings, titles, pull-quotes, "Pour ceux qui…" lines.
- **IBM Plex Sans** (400/500/600 + italic) — nav, body UI, metadata. Default `body` font.
- Playfair Display + Kalam are loaded but only Playfair is used, and only in the rejected Gazette variant — skip for Salon.

Type scale (desktop): page H1 `40–44px`, hero H1 `33px`, section H2 `26px`,
card title `16.5px`, body `13.5–14px`, eyebrow `10–11px` uppercase, letter-spacing `.14em`.

### Layout / shape
- Desktop shell `1200px`; left rail `224px` fixed; `<main>` flex, padding `36–40px`.
- Radius: cards `11–14px`, buttons/pills/inputs `999px`, cover art `10–12px`.
- Shadows: cover art `0 12–16px 26–32px -12/-14px rgba(brown)`; cards `0 8px 20px -14px rgba(60,40,20,.4)`.
- Hover motions in design: `translateY(-3/-4px)` on cards, bg swaps on nav/buttons.

### Responsive (mobile = 390px frame)
- Rail → top bar: `☰` hamburger (left) + centered wordmark. Drawer = 75%-width overlay
  panel (`#f6efe3`), scrim `rgba(36,26,18,.5)`, `✕` close.
- Grids reflow: recent 3-col → stacked/horizontal rows; archive 3-col → 2-col.
- Breakpoints for subtask 01: sm / md / lg (mobile-first).

## Navigation (shared `<Layout>`)
- Brand: **Clap _et_ chapitre** ("et" italic, `--accent`), gold underline mark (`28–30px × 2px`),
  tagline "Trouve ta prochaine histoire" (uppercase, `--faint`).
- **Primary nav = medium filters:** Films · Séries · Livres · Docs.
- **Secondary nav = pages:** Bilan culturel · À propos · Me suivre.
- Active item: `--ink` bg, cream text (`#fdf8f0`), `6px` gold dot.

## Page inventory → decomposition subtasks
| Subtask | Route | Design option | Notes |
|---------|-------|---------------|-------|
| 01 scaffold + design system | — | rail Layout + mobile drawer | tokens, fonts, shell, routing |
| 02 Home | `/` | **1a Salon** | hero latest avis · "Avis récents" 3-col grid · newsletter band |
| 03 Article | `/article/:id` | ⚠ no dedicated hi-fi screen | see discrepancy #2 |
| 04 Bilan culturel | `/bilan-culturel` | **2a** | month switcher · humeur du mois · reviews by medium · social + comment thread |
| 05 Archives | `/archives` | **2b** | year-grouped bilan cards (current yr 3-col expanded, older collapsed) |
| 06 À propos | `/a-propos` | **3b** | portrait hero band · bio · "Cette année" stats · follow CTA |
| 07 Me suivre | `/me-suivre` | **3c** | newsletter feature · socials grid (Threads/Letterboxd/Babelio/LinkedIn) |

Mock content is French, author **Marie-Zoé**. Recurring sample items: *Un dernier été* (film),
*L'année de la pluie* (livre), *Les nuits blanches* (série), *Fragments* (docs).

## Decisions (owner, 2026-07-13)
1. **Direction — Salon (1a).** Confirmed winner; build Salon only. Gazette (1b) is rejected.
2. **`/article/:id` — article view first.** The design's "article" is the monthly *Bilan culturel*
   (2a); per-avis pages are only implied ("Lire l'avis"). Owner will **design/build the article view
   as a separate step BEFORE subtask 03.** Subtask 03 gets a placeholder route only for now.
   **STOP and remind the owner to do the article view before starting subtask 03.**
3. **Medium filters get their own routes.** Films/Séries/Livres/Docs become routes
   (`/films`, `/series`, `/livres`, `/docs` — confirm exact paths at /plan), reusing the home feed
   filtered by medium for now, not in-place filters.
