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
    genreMeta: 'Comédie dramatique · 2 h 04 · 2026',
    readingTime: '4 min de lecture',
    body:
      'Il y a des films qui ressemblent à une maison de vacances qu’on referme pour la dernière fois. Un dernier été est de ceux-là : la lumière y est trop belle pour être honnête, et chaque plan semble savoir qu’il ne reviendra pas.\n\n' +
      'Le récit tient en trois jours et quatre personnages. On les regarde tourner autour de la table, du ponton, de la même question jamais posée. Rien n’explose ; tout se déplace d’un millimètre, ce qui est bien plus difficile à filmer.\n\n' +
      'La mise en scène refuse le crescendo. Elle installe des silences, les laisse durer une seconde de trop, et c’est dans cette seconde-là que le film se joue. On en sort avec l’impression d’avoir surpris une conversation qui ne nous était pas destinée.\n\n' +
      'Le dernier tiers rattrape ce qu’on croyait perdu. Une scène de dîner, filmée en un seul plan, dit tout ce que les personnages se sont tus pendant vingt ans — sans qu’aucun d’eux ne prononce le mot juste.\n\n' +
      'On referme la porte, on rend les clés, et on garde le sable dans les poches. C’est exactement ce qu’on demande à un film d’été.',
    pullQuote:
      'Rien n’explose : tout se déplace d’un millimètre, et c’est là que le film devient bouleversant.',
    related: [
      {
        id: 'l-annee-de-la-pluie',
        note: 'Même façon de fouiller l’amitié qui vieillit.',
      },
      {
        id: 'les-nuits-blanches',
        note: 'Pour prolonger le grain doux-amer.',
      },
    ],
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
    genreMeta: 'Roman · 312 pages · 2026',
    readingTime: '3 min de lecture',
    body:
      'On entre dans L’année de la pluie comme on pousse une porte trempée : à contrecœur, puis sans plus vouloir ressortir. La narratrice raconte douze mois d’averses et une amitié qui prend l’eau en même temps que la ville.\n\n' +
      'L’écriture est sèche là où l’on attendait du lyrisme. C’est ce décalage qui fait tenir le livre debout : la pluie n’y est jamais une métaphore, seulement un fait, obstiné, quotidien.\n\n' +
      'Le dernier tiers accélère et pardonne. On referme le roman avec le sentiment d’avoir été essoré, puis séché au soleil.',
    pullQuote:
      'La pluie n’y est jamais une métaphore : seulement un fait, obstiné, quotidien.',
    related: [
      {
        id: 'un-dernier-ete',
        note: 'La même chaleur qui s’effrite entre quatre personnes.',
      },
    ],
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
    genreMeta: 'Série · 6 × 48 min · 2026',
    readingTime: '5 min de lecture',
    body:
      'Six épisodes, six insomnies, une ville filmée à l’heure où elle ne se surveille plus. Les nuits blanches avance au rythme d’une confidence qu’on n’ose faire qu’à trois heures du matin.\n\n' +
      'La série assume sa lenteur et en fait sa méthode : on apprend à connaître ses personnages par leurs trajets, leurs cafés froids, leurs messages non envoyés.\n\n' +
      'L’épisode 4, tourné presque entièrement dans un taxi, est le sommet de la saison. Rien d’autre à signaler que deux visages et une conversation — et c’est amplement suffisant.',
    pullQuote:
      'Une ville filmée à l’heure où elle ne se surveille plus.',
    related: [
      {
        id: 'un-dernier-ete',
        note: 'Deux récits qui préfèrent le hors-champ à l’aveu.',
      },
    ],
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
    genreMeta: 'Documentaire · 1 h 38 · 2026',
    readingTime: '3 min de lecture',
    body:
      'Fragments part d’un carton de bobines abandonnées et en tire une mémoire collective. Le montage, patient, refuse la voix off explicative : ce sont les images elles-mêmes qui finissent par parler.\n\n' +
      'On y croise des visages sans nom, des fêtes sans date, des gestes qu’aucune archive n’avait jugés dignes d’être conservés. C’est bouleversant précisément parce que c’est anodin.\n\n' +
      'Un documentaire qui répare, à sa mesure, un peu de ce que le temps efface.',
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
    body:
      'Un drame filmé dans une lumière si froide qu’on en sort les mains gourdes. La lumière du Nord ne raconte pourtant rien de glacé : c’est une histoire de réchauffement lent, presque imperceptible.\n\n' +
      'Son actrice principale tient tout le film dans un mutisme qui n’a jamais l’air d’une posture. On la regarde décider, hésiter, renoncer — sans une réplique de trop.',
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
    body:
      'Le jardin suspendu se lit comme on jardine : lentement, en revenant sur ses pas. Chaque chapitre correspond à une saison, et la prose y pousse littéralement, phrase après phrase.\n\n' +
      'C’est un livre qui demande de la patience et la rend au centuple. On le referme les mains pleines de terre.',
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
    body:
      'Ceux qui restent est une chronique du deuil qui n’élève jamais la voix. La série s’installe dans les gestes du quotidien et laisse le chagrin se déposer, épisode après épisode.\n\n' +
      'On y rit, aussi, entre deux larmes — et c’est cette justesse de ton qui la rend inoubliable.',
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
    body:
      'Archives du silence est un travail d’enquête d’une patience rare. Trois ans de dépouillement pour rendre audible ce que les procès-verbaux avaient consigné puis rangé.\n\n' +
      'Le film ne cherche jamais le sensationnel : il pose les documents, laisse les témoins parler, et fait confiance au spectateur pour tirer le fil.',
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
