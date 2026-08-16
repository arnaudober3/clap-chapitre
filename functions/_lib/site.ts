/**
 * Canonical origin used to build every absolute URL a Function emits: the
 * sitemap's `<loc>`, `robots.txt`'s `Sitemap:` line, and the bot-prerender
 * shell's canonical/OG/Twitter tags.
 *
 * Mirrored in `src/seo/constants.ts` rather than shared, because `functions/_lib/`
 * is deliberately never imported by `src/` (see CLAUDE.md).
 */
// TODO(seo-domain): remplacer par le domaine définitif une fois choisi.
export const SITE_URL = 'https://clap-chapitre.pages.dev';
