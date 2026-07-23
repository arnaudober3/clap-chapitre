# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

**Clap et chapitre** — a front-end-only prototype for a French cultural review site.
A single fictional author (Marie-Zoé) reviews works across four **media**: films,
séries, livres, docs. There is **no backend, no network, no real data**: every page
renders static French mock content from `src/mock/`. All UI copy is in French.

## Commands

```bash
npm run dev          # Vite dev server, host 0.0.0.0 (http://localhost:5173)
npm run build        # tsc typecheck + vite build → dist/
npm run preview      # serve the production build
npm test             # vitest run (one-shot)
npm run test:watch   # vitest watch mode
npx vitest run src/test/art3-article-body.test.tsx   # a single test file
npx vitest run -t "renders the hook"                 # tests matching a name
```

Note: the `Dockerfile` CMD references `npm run dev:all`, which does **not** exist —
use `npm run dev`. There is a `.wrangler/` dir but no active Cloudflare workflow.

## Architecture

Vite + React 18 + TypeScript SPA, `react-router-dom` v6, client-side routing only.
Tests: Vitest + @testing-library/react + jsdom (`vite.config.ts`, globals on,
`src/test/setup.ts` just imports jest-dom).

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

**Content types** (`src/mock/types.ts`): `Article` (an "avis"/review — the central
type, reused by feeds, article view, and bilans) and `Comment`. Mock data files in
`src/mock/` export the data plus **pure selector functions** (no React, no
module-level mutable state) so pages filter without side effects.

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
  scaffold, `ar*` = archives). Match the existing prefix when adding tests.
- TypeScript is strict with `noUnusedLocals`/`noUnusedParameters` — unused symbols
  fail the build.
- Covers/portraits are CSS gradient strings, not image URLs — keep it network-free.
