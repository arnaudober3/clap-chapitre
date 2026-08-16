/**
 * Hand-written SEO copy for pages/states that don't have their own excerpt to
 * draw from — the medium feeds, the archives, 404, admin. Same table shape as
 * `src/media.ts`'s `MEDIA`.
 */
import type { Medium } from '../../shared/content';

export const MEDIUM_SEO: Record<Medium, { title: string; description: string }> = {
  film: {
    title: 'Films',
    description:
      'Les critiques de films de Marie-Zoé : sorties et redécouvertes qui valent le détour.',
  },
  serie: {
    title: 'Séries',
    description: 'Les avis sur les séries suivies par Marie-Zoé, saison après saison.',
  },
  livre: {
    title: 'Livres',
    description: "Les lectures de Marie-Zoé : romans, essais et récits qui méritent d'être ouverts.",
  },
  doc: {
    title: 'Docs',
    description: 'Les documentaires regardés et racontés par Marie-Zoé.',
  },
};

export const ARCHIVE_SEO: Record<Medium, { title: string; description: string }> = {
  film: {
    title: 'Archives — Films',
    description: 'Tous les avis films de Clap et chapitre, du plus récent au plus ancien.',
  },
  serie: {
    title: 'Archives — Séries',
    description: 'Tous les avis séries de Clap et chapitre, du plus récent au plus ancien.',
  },
  livre: {
    title: 'Archives — Livres',
    description: 'Tous les avis livres de Clap et chapitre, du plus récent au plus ancien.',
  },
  doc: {
    title: 'Archives — Docs',
    description: 'Tous les avis docs de Clap et chapitre, du plus récent au plus ancien.',
  },
};

export const BILAN_ARCHIVES_SEO = {
  title: 'Archives des bilans culturels',
  description: 'Tous les bilans culturels mensuels de Clap et chapitre.',
};

export const NOT_FOUND_SEO = {
  title: 'Page introuvable',
  description: "Cette page n'existe pas ou plus sur Clap et chapitre.",
};

export const APROPOS_FALLBACK_DESCRIPTION = 'À propos de Marie-Zoé et de Clap et chapitre.';
export const ME_SUIVRE_FALLBACK_DESCRIPTION =
  'Comment suivre Clap et chapitre : newsletter et réseaux sociaux.';

export const ADMIN_TITLE = 'Espace admin';
export const ADMIN_LOGIN_TITLE = 'Connexion';
