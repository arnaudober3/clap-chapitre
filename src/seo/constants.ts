/**
 * Canonical origin used to build every absolute URL a page emits: `og:url`,
 * `twitter:*`, JSON-LD `item`/`url` fields and the `<link rel="canonical">`.
 *
 * Mirrored in `functions/_lib/site.ts` rather than shared: `functions/_lib/` is
 * deliberately never imported by `src/` (see CLAUDE.md).
 */
// TODO(seo-domain): remplacer par le domaine définitif une fois choisi.
export const SITE_URL = 'https://clap-chapitre.pages.dev';

export const SITE_NAME = 'Clap et chapitre';

export const DEFAULT_TITLE = SITE_NAME;

/** Every page title but the home shell's own gets suffixed with the site name. */
export function titleTemplate(title: string): string {
  return title === DEFAULT_TITLE ? DEFAULT_TITLE : `${title} · ${SITE_NAME}`;
}
