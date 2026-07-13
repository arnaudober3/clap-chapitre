# DEV-19-01 — Scaffold Vite+React app, design system & routing shell

**Linear:** DEV-19 · **Recipe:** module · **Direction:** Salon (option 1a)

Stand up the Vite + React + TypeScript SPA that every DEV-19 page builds on: the
shared `<Layout>`, the Salon design tokens, the client-side route table, and the
shared mock types. Pages themselves are **placeholders** here — real content lands
in subtasks 02+.

Authoritative design: `.claude/work/DEV-19/design-reference.md` (token table,
type scale, layout, nav, responsive) distilled from
`.claude/work/DEV-19/handoff/clap-chapitre/project/Clap et chapitre - Hifi.dc.html`.
Read both before implementing.

## Scope
- Vite + React 18 + TypeScript, `react-router-dom` v6.
- Vitest + @testing-library/react + jsdom for tests.
- Design tokens as CSS custom properties in `src/styles/tokens.css`; global reset/base in `src/styles/global.css`.
- Shared `<Layout>` = `<Header/>` (nav) + `<main><Outlet/></main>` + `<Footer/>`.
- Mock types in `src/mock/types.ts`.
- Placeholder page components wired into every route.

## Routes (per owner decisions 2026-07-13)
| Path | Component | Notes |
|------|-----------|-------|
| `/` | `HomePage` | main feed (placeholder) |
| `/films` `/series` `/livres` `/docs` | `HomePage` | medium filter routes — reuse home feed for now |
| `/article/:id` | `ArticlePage` | **placeholder only** — real article view designed before subtask 03 |
| `/bilan-culturel` | `BilanCulturelPage` | |
| `/archives` | `ArchivesPage` | |
| `/a-propos` | `AProposPage` | |
| `/me-suivre` | `MeSuivrePage` | |

## Design system essentials (see design-reference.md for full values)
- Fonts: **Newsreader** (serif, headings/quotes), **IBM Plex Sans** (body/UI, default).
- Core colors: `--bg #fdf8f0`, `--surface #f6efe3`, `--ink #3f2e20`, `--body #5c4a38`,
  `--accent #b0502f` (terracotta), `--gold #d8a24a`, `--border #e9dfce`.
- Shell: 1200px max, left rail 224px (desktop). Mobile-first breakpoints sm/md/lg.
- Nav: brand "Clap *et* chapitre" (italic terracotta "et" + gold underline mark);
  primary = Films/Séries/Livres/Docs; secondary = Bilan culturel/À propos/Me suivre;
  active item = `--ink` bg + cream text + gold dot.
- Mobile: rail collapses to top bar (☰ + centered wordmark); drawer = 75% overlay panel.

## Out of scope
- Real page content/layout for Home, Bilan, Archives, À propos, Me suivre (subtasks 02, 04–07).
- The article view / `/article/:id` real UI (owner designs it before subtask 03).
- Gazette (1b) styling.
- Any backend, real data, or network calls.
