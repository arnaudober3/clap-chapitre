/**
 * Monthly "bilan culturel" mock content — the model shared with subtask 05
 * (BilanCulturelArchives). The shape is frozen by the DEV-19-05 contract: `bilans`,
 * `bilansByYear`, `latestBilan`. `bilanById` is an additive selector for the
 * Bilan culturel page. Covers are CSS gradient strings (no network requests);
 * author is Marie-Zoé. Selectors are pure — no React, no module-level mutable
 * state. Grouping-by-medium is a page concern, not a selector.
 */
import type { PublishedBilan } from './types';

/**
 * A month's cultural review, grouped as an "article" on the Bilan page.
 * Kept as an alias: the public site only ever renders published bilans, and the
 * DEV-19-05 contract froze this name. The shape itself now lives in `types.ts`
 * next to the article hierarchy it mirrors.
 */
export type MonthlyBilan = PublishedBilan;

/**
 * All monthly bilans, newest-first. Covers ≥ 2 years; the current year (2026)
 * holds ≥ 3 months so DEV-19-05's BilanCulturelArchives renders one expanded year + a
 * collapsed year. The newest month is Juin 2026 and carries full detail.
 */
export const bilans: PublishedBilan[] = [
  {
    id: '2026-06',
    year: 2026,
    month: 6,
    monthLabel: 'Juin',
    title: 'Juin 2026 — les longues soirées',
    mood: 'Un mois de lumière rasante, où chaque œuvre semblait chercher la sortie du tunnel. On a beaucoup regardé le ciel, un peu moins l’écran, et pourtant tout ce qu’on a vu nous a tenus éveillés.',
    counts: { film: 1, serie: 1, livre: 1 },
    views: 3420,
    likes: 148,
    status: 'published',
    publishedAt: '2026-07-02',
    avis: [
      {
        id: 'bilan-2026-06-la-lumiere-du-nord',
        title: 'La lumière du Nord',
        medium: 'film',
        excerpt:
          'Un drame glacé et lumineux, porté par une actrice dont on ne détache pas les yeux.',
        cover: 'linear-gradient(150deg,#d18a5a,#9a4d2c)',
        date: '27 juin 2026',
        author: 'Marie-Zoé',
        likes: 88,
        comments: 15,
        status: 'published',
        views: 1180,
        publishedAt: '2026-06-27',
        hook: 'Peut-on se réchauffer à une lumière qui vient du froid ?',
        forThoseWho:
          'Pour ceux qui aiment les drames où le décor parle autant que les acteurs.',
        body: 'Il y a des films qui vous laissent l’impression d’avoir passé l’hiver dehors. La lumière du Nord est de ceux-là : chaque plan est un paysage gelé, et pourtant on n’a jamais eu si chaud au cœur.\n\nL’actrice principale porte le film sur ses épaules avec une retenue qui frôle le mutisme. Rien n’est dit, tout est suggéré, et c’est précisément là que réside la force du récit.\n\nOn en ressort lessivé et reconnaissant — comme après une longue marche dans le vent.',
        relatedTo: {
          title: 'Un dernier été',
          note: 'Même goût pour les silences qui pèsent plus lourd que les mots.',
        },
      },
      {
        id: 'bilan-2026-06-ceux-qui-restent',
        title: 'Ceux qui restent',
        medium: 'serie',
        excerpt:
          'Une chronique de deuil et de reconstruction, tendre sans jamais tomber dans le pathos.',
        cover: 'linear-gradient(150deg,#6a8a96,#42606d)',
        date: '15 juin 2026',
        author: 'Marie-Zoé',
        likes: 103,
        comments: 22,
        status: 'published',
        views: 1040,
        publishedAt: '2026-06-15',
        hook: 'Comment continue-t-on à vivre quand il manque quelqu’un ?',
        forThoseWho:
          'Pour ceux qui préfèrent les séries qui chuchotent plutôt qu’elles ne crient.',
        body: 'Six épisodes pour apprendre à respirer de nouveau. Ceux qui restent ne cherche jamais la grande scène ; il s’installe dans les gestes du quotidien et laisse le chagrin se déposer.\n\nLa mise en scène, patiente, refuse le pathos. On rit même, parfois, entre deux larmes — et c’est cette justesse qui rend la série inoubliable.',
        relatedTo: {
          title: 'Les nuits blanches',
          note: 'La même confidence chuchotée à l’aube, à hauteur d’insomnie.',
        },
      },
      {
        id: 'bilan-2026-06-le-jardin-suspendu',
        title: 'Le jardin suspendu',
        medium: 'livre',
        excerpt:
          'Une prose botanique où chaque phrase pousse lentement vers la lumière.',
        cover: 'linear-gradient(150deg,#8ea06a,#5b6d40)',
        date: '21 juin 2026',
        author: 'Marie-Zoé',
        likes: 64,
        comments: 9,
        status: 'published',
        views: 720,
        publishedAt: '2026-06-21',
        hook: 'Et si un livre pouvait pousser, page après page ?',
        forThoseWho: 'Pour ceux qui lisent lentement, comme on jardine.',
        body: 'Le jardin suspendu est un roman qui se cultive. La prose y est si dense qu’on a envie de la respirer plutôt que de la lire.\n\nChaque chapitre est une saison ; on referme le livre les mains pleines de terre et l’esprit apaisé.',
        relatedTo: {
          title: 'L’année de la pluie',
          note: 'Même façon de faire d’un élément naturel un personnage à part entière.',
        },
      },
    ],
  },
  {
    id: '2026-05',
    year: 2026,
    month: 5,
    monthLabel: 'Mai',
    title: 'Mai 2026 — tout dehors',
    mood: 'Un mois plus turbulent, traversé de coups de foudre et de quelques déceptions assumées. On a préféré l’audace au confort.',
    counts: { film: 1, livre: 1 },
    views: 2960,
    likes: 121,
    status: 'published',
    publishedAt: '2026-06-03',
    avis: [
      {
        id: 'bilan-2026-05-la-fete-immobile',
        title: 'La fête immobile',
        medium: 'film',
        excerpt:
          'Une comédie douce-amère sur l’art de rester quand tout le monde part.',
        cover: 'linear-gradient(150deg,#c56a3f,#8f3f24)',
        date: '24 mai 2026',
        author: 'Marie-Zoé',
        likes: 71,
        comments: 11,
        status: 'published',
        views: 640,
        publishedAt: '2026-05-24',
      },
      {
        id: 'bilan-2026-05-marges',
        title: 'Marges',
        medium: 'livre',
        excerpt:
          'Un recueil de nouvelles qui écrit dans les blancs de nos vies.',
        cover: 'linear-gradient(150deg,#7a8c5a,#4f6138)',
        date: '17 mai 2026',
        author: 'Marie-Zoé',
        likes: 49,
        comments: 6,
        status: 'published',
        views: 470,
        publishedAt: '2026-05-17',
      },
    ],
  },
  {
    id: '2026-04',
    year: 2026,
    month: 4,
    monthLabel: 'Avril',
    title: 'Avril 2026 — rien fini, tout commencé',
    counts: { serie: 1, doc: 1 },
    views: 2410,
    likes: 97,
    status: 'published',
    publishedAt: '2026-05-02',
    avis: [
      {
        id: 'bilan-2026-04-saison-basse',
        title: 'Saison basse',
        medium: 'serie',
        excerpt:
          'Un thriller balnéaire hors saison, où l’ennui devient une menace.',
        cover: 'linear-gradient(150deg,#5a7a86,#37525f)',
        date: '19 avril 2026',
        author: 'Marie-Zoé',
        likes: 84,
        comments: 14,
        status: 'published',
        views: 820,
        publishedAt: '2026-04-19',
      },
      {
        id: 'bilan-2026-04-voix-off',
        title: 'Voix off',
        medium: 'doc',
        excerpt:
          'Un documentaire sur les doubleurs, ces visages qu’on n’entend jamais vraiment.',
        cover: 'linear-gradient(150deg,#9a6a8a,#5f3a55)',
        date: '5 avril 2026',
        author: 'Marie-Zoé',
        likes: 38,
        comments: 4,
        status: 'published',
        views: 360,
        publishedAt: '2026-04-05',
      },
    ],
  },
  {
    id: '2025-12',
    year: 2025,
    month: 12,
    monthLabel: 'Décembre',
    title: 'Décembre 2025 — bilan de l’année',
    mood: 'On a clôturé l’année au coin du feu, avec des œuvres qui réchauffent sans mièvrerie.',
    counts: { film: 1, livre: 1 },
    views: 6740,
    likes: 312,
    status: 'published',
    publishedAt: '2026-01-02',
    avis: [
      {
        id: 'bilan-2025-12-hiver-clair',
        title: 'Hiver clair',
        medium: 'film',
        excerpt: 'Un conte d’hiver lumineux, à contre-courant de la grisaille.',
        cover: 'linear-gradient(150deg,#d18a5a,#9a4d2c)',
        date: '20 décembre 2025',
        author: 'Marie-Zoé',
        likes: 92,
        comments: 18,
        status: 'published',
        views: 910,
        publishedAt: '2025-12-20',
      },
      {
        id: 'bilan-2025-12-le-livre-des-nuits',
        title: 'Le livre des nuits',
        medium: 'livre',
        excerpt: 'Une saga familiale dévorée entre deux fêtes.',
        cover: 'linear-gradient(150deg,#8ea06a,#5b6d40)',
        date: '11 décembre 2025',
        author: 'Marie-Zoé',
        likes: 55,
        comments: 7,
        status: 'published',
        views: 520,
        publishedAt: '2025-12-11',
      },
    ],
  },
  {
    id: '2025-11',
    year: 2025,
    month: 11,
    monthLabel: 'Novembre',
    title: 'Novembre 2025 — sous la couette',
    counts: { serie: 1, doc: 1 },
    views: 2130,
    likes: 88,
    status: 'published',
    publishedAt: '2025-12-01',
    avis: [
      {
        id: 'bilan-2025-11-brumes',
        title: 'Brumes',
        medium: 'serie',
        excerpt: 'Une enquête atmosphérique où le brouillard cache plus qu’il ne montre.',
        cover: 'linear-gradient(150deg,#6a8a96,#42606d)',
        date: '22 novembre 2025',
        author: 'Marie-Zoé',
        likes: 67,
        comments: 10,
        status: 'published',
        views: 660,
        publishedAt: '2025-11-22',
      },
      {
        id: 'bilan-2025-11-les-voix-basses',
        title: 'Les voix basses',
        medium: 'doc',
        excerpt: 'Un portrait sensible des bibliothécaires de nuit.',
        cover: 'linear-gradient(150deg,#aa7a9a,#6f4a65)',
        date: '8 novembre 2025',
        author: 'Marie-Zoé',
        likes: 41,
        comments: 5,
        status: 'published',
        views: 390,
        publishedAt: '2025-11-08',
      },
    ],
  },
];

/**
 * All bilans grouped by year, years descending, months within a year
 * descending (consumed by DEV-19-05's BilanCulturelArchives).
 */
export function bilansByYear(): Array<{ year: number; months: MonthlyBilan[] }> {
  const byYear = new Map<number, MonthlyBilan[]>();
  for (const bilan of bilans) {
    const months = byYear.get(bilan.year);
    if (months) months.push(bilan);
    else byYear.set(bilan.year, [bilan]);
  }
  return Array.from(byYear.entries())
    .sort((a, b) => b[0] - a[0])
    .map(([year, months]) => ({
      year,
      months: [...months].sort((a, b) => b.month - a.month),
    }));
}

/** The most recent bilan (default view; "dernier bilan" target for 05). */
export function latestBilan(): MonthlyBilan {
  return bilans[0];
}

/** Additive selector: resolve a bilan by its 'YYYY-MM' id (undefined if none). */
export function bilanById(id: string): MonthlyBilan | undefined {
  return bilans.find((bilan) => bilan.id === id);
}
