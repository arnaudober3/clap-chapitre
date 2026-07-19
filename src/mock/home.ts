/**
 * Salon home feed mock content. Static French reviews (author Marie-Zoé),
 * newest first, media mixed. Covers are CSS gradient placeholders — no network
 * image requests. Selectors are pure functions (no React, no module-level
 * mutable state) so pages can filter the feed by medium.
 */
import type { Article, Medium } from './types';

/** All mock reviews, newest first, media mixed. Author: Marie-Zoé. */
export const feed: Article[] = [
  {
    id: 'un-dernier-ete',
    title: 'Un dernier été',
    medium: 'film',
    excerpt:
      'Un huis clos solaire où chaque silence pèse plus lourd que les mots. Une merveille de tension douce.',
    cover: 'linear-gradient(150deg,#c56a3f,#8f3f24)',
    date: '18 juillet 2026',
    author: 'Marie-Zoé',
    likes: 128,
    comments: 24,
    hook: 'Et si le dernier été n’était jamais vraiment le dernier ?',
    forThoseWho:
      'Pour ceux qui aiment les fins qui laissent la fenêtre entrouverte.',
  },
  {
    id: 'l-annee-de-la-pluie',
    title: 'L’année de la pluie',
    medium: 'livre',
    excerpt:
      'Un roman dévoré en un week-end, où la pluie devient un personnage à part entière.',
    cover: 'linear-gradient(150deg,#7a8c5a,#4f6138)',
    date: '14 juillet 2026',
    author: 'Marie-Zoé',
    likes: 96,
    comments: 17,
    hook: 'Peut-on aimer une saison qui ne s’arrête jamais ?',
    forThoseWho: 'Pour ceux qui lisent au son des averses.',
  },
  {
    id: 'les-nuits-blanches',
    title: 'Les nuits blanches',
    medium: 'serie',
    excerpt:
      'Six épisodes insomniaques, filmés comme une longue confidence chuchotée à l’aube.',
    cover: 'linear-gradient(150deg,#5a7a86,#37525f)',
    date: '9 juillet 2026',
    author: 'Marie-Zoé',
    likes: 141,
    comments: 31,
    hook: 'Que reste-t-il de nous quand la ville dort ?',
    forThoseWho: 'Pour ceux qui préfèrent les récits qui prennent leur temps.',
  },
  {
    id: 'fragments',
    title: 'Fragments',
    medium: 'doc',
    excerpt:
      'Un documentaire choral qui recompose une mémoire collective à partir de bribes oubliées.',
    cover: 'linear-gradient(150deg,#9a6a8a,#5f3a55)',
    date: '3 juillet 2026',
    author: 'Marie-Zoé',
    likes: 72,
    comments: 12,
    hook: 'Et si nos oublis en disaient plus que nos souvenirs ?',
    forThoseWho: 'Pour ceux qui aiment les puzzles émotionnels.',
  },
  {
    id: 'la-lumiere-du-nord',
    title: 'La lumière du Nord',
    medium: 'film',
    excerpt:
      'Un drame glacé et lumineux, porté par une actrice dont on ne détache pas les yeux.',
    cover: 'linear-gradient(150deg,#d18a5a,#9a4d2c)',
    date: '27 juin 2026',
    author: 'Marie-Zoé',
    likes: 88,
    comments: 15,
  },
  {
    id: 'le-jardin-suspendu',
    title: 'Le jardin suspendu',
    medium: 'livre',
    excerpt:
      'Une prose botanique où chaque phrase pousse lentement vers la lumière.',
    cover: 'linear-gradient(150deg,#8ea06a,#5b6d40)',
    date: '21 juin 2026',
    author: 'Marie-Zoé',
    likes: 64,
    comments: 9,
  },
  {
    id: 'ceux-qui-restent',
    title: 'Ceux qui restent',
    medium: 'serie',
    excerpt:
      'Une chronique de deuil et de reconstruction, tendre sans jamais tomber dans le pathos.',
    cover: 'linear-gradient(150deg,#6a8a96,#42606d)',
    date: '15 juin 2026',
    author: 'Marie-Zoé',
    likes: 103,
    comments: 22,
  },
  {
    id: 'archives-du-silence',
    title: 'BilanCulturelArchives du silence',
    medium: 'doc',
    excerpt:
      'Un travail d’enquête patient sur les voix que l’Histoire a préféré taire.',
    cover: 'linear-gradient(150deg,#aa7a9a,#6f4a65)',
    date: '8 juin 2026',
    author: 'Marie-Zoé',
    likes: 57,
    comments: 8,
  },
];

/**
 * The hero item for a page: newest overall (when `medium` is undefined), or the
 * newest review of `medium`. Returns undefined when no item matches.
 */
export function latestFor(medium?: Medium): Article | undefined {
  if (medium === undefined) return feed[0];
  return feed.find((item) => item.medium === medium);
}

/**
 * The grid items for a page: the rest of the feed. When `medium` is undefined,
 * this is the whole feed minus the overall hero. When set, it is that medium's
 * items minus that medium's hero.
 */
export function recentFor(medium?: Medium): Article[] {
  const hero = latestFor(medium);
  const pool =
    medium === undefined ? feed : feed.filter((item) => item.medium === medium);
  return pool.filter((item) => item !== hero);
}
