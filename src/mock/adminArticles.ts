/**
 * The admin article catalogue — every avis Marie-Zoé has written, published or
 * not. It is the same `Article` model the public site renders: the published
 * entries are literally the ones exposed by `articles.ts` (same ids), and this
 * module only adds the avis the public feed never showed — older published
 * reviews and the drafts in progress.
 *
 * Static French mock content, no network. Selectors are pure functions (no
 * React, no module-level mutable state), mirroring home.ts / bilans.ts.
 */
import type { Article, DraftArticle, PublishedArticle, Medium } from './types';
import { articles } from './articles';
import { MEDIA } from '../media';
import { fold } from '../format';

/** Which publication states a listing shows. */
export type StatusFilter = 'all' | 'published' | 'draft';

/** A medium filter, or every medium at once. */
export type MediumFilter = Medium | 'all';

/** The listing sort orders. */
export type SortId = 'recent' | 'oldest' | 'views';

/** The full listing query — one object so pages thread a single piece of state. */
export interface ArticleQuery {
  status: StatusFilter;
  medium: MediumFilter;
  search: string;
  sort: SortId;
}

/** Rows per listing page — the design shows "7 articles sur 32". */
export const PAGE_SIZE = 7;

/** The listing's starting query: everything, newest first. */
export const DEFAULT_QUERY: ArticleQuery = {
  status: 'all',
  medium: 'all',
  search: '',
  sort: 'recent',
};

/**
 * Published avis that predate the home feed and the bilans — the archive the
 * admin listing pages through. Same shape as any other avis; they simply never
 * made it into a feed selector.
 */
const OLDER_PUBLISHED: PublishedArticle[] = [
  {
    id: 'la-chambre-d-a-cote',
    title: 'La chambre d’à côté',
    medium: 'film',
    excerpt: 'Deux heures de huis clos, zéro respiration.',
    cover: 'linear-gradient(150deg,#c56a3f,#8f3f24)',
    date: '19 juin 2026',
    author: 'Marie-Zoé',
    likes: 41,
    comments: 5,
    status: 'published',
    views: 980,
    publishedAt: '2026-06-19',
    hook: 'Deux heures de huis clos, zéro respiration.',
  },
  {
    id: 'les-grands-soirs',
    title: 'Les grands soirs',
    medium: 'serie',
    excerpt: 'Une saison de trop, mais quelle saison.',
    cover: 'linear-gradient(150deg,#5a7a86,#37525f)',
    date: '8 juin 2026',
    author: 'Marie-Zoé',
    likes: 33,
    comments: 4,
    status: 'published',
    views: 870,
    publishedAt: '2026-06-08',
    hook: 'Une saison de trop, mais quelle saison.',
  },
  {
    id: 'le-gout-des-autres-villes',
    title: 'Le goût des autres villes',
    medium: 'livre',
    excerpt: 'Un récit de voyage sans une once de carte postale.',
    cover: 'linear-gradient(150deg,#7a8c5a,#4f6138)',
    date: '31 mai 2026',
    author: 'Marie-Zoé',
    likes: 28,
    comments: 3,
    status: 'published',
    views: 640,
    publishedAt: '2026-05-31',
    hook: 'Un récit de voyage sans une once de carte postale.',
  },
  {
    id: 'plein-cadre',
    title: 'Plein cadre',
    medium: 'doc',
    excerpt: 'Un an dans l’atelier d’une photographe qui ne se photographie jamais.',
    cover: 'linear-gradient(150deg,#9a6a8a,#5f3a55)',
    date: '12 mai 2026',
    author: 'Marie-Zoé',
    likes: 25,
    comments: 4,
    status: 'published',
    views: 580,
    publishedAt: '2026-05-12',
    hook: 'Que voit-on quand on refuse d’être vue ?',
  },
  {
    id: 'les-heures-creuses',
    title: 'Les heures creuses',
    medium: 'film',
    excerpt: 'Une comédie de bureau qui prend le vide au sérieux.',
    cover: 'linear-gradient(150deg,#d18a5a,#9a4d2c)',
    date: '28 avril 2026',
    author: 'Marie-Zoé',
    likes: 34,
    comments: 6,
    status: 'published',
    views: 720,
    publishedAt: '2026-04-28',
    hook: 'Et si l’ennui était le dernier espace libre ?',
  },
  {
    id: 'terrains-vagues',
    title: 'Terrains vagues',
    medium: 'serie',
    excerpt: 'Huit épisodes en périphérie, filmés à hauteur d’adolescence.',
    cover: 'linear-gradient(150deg,#6a8a96,#42606d)',
    date: '12 avril 2026',
    author: 'Marie-Zoé',
    likes: 27,
    comments: 5,
    status: 'published',
    views: 610,
    publishedAt: '2026-04-12',
    hook: 'Que devient-on quand la ville s’arrête là ?',
  },
  {
    id: 'la-part-du-feu',
    title: 'La part du feu',
    medium: 'livre',
    excerpt: 'Un roman court, sec, qui brûle exactement ce qu’il faut.',
    cover: 'linear-gradient(150deg,#8ea06a,#5b6d40)',
    date: '29 mars 2026',
    author: 'Marie-Zoé',
    likes: 22,
    comments: 3,
    status: 'published',
    views: 530,
    publishedAt: '2026-03-29',
    hook: 'Que garde-t-on quand on décide de tout laisser partir ?',
  },
  {
    id: 'sans-titre-1979',
    title: 'Sans titre, 1979',
    medium: 'doc',
    excerpt: 'L’enquête sur un tableau que personne n’a jamais revendiqué.',
    cover: 'linear-gradient(150deg,#aa7a9a,#6f4a65)',
    date: '15 mars 2026',
    author: 'Marie-Zoé',
    likes: 18,
    comments: 2,
    status: 'published',
    views: 410,
    publishedAt: '2026-03-15',
    hook: 'À qui appartient une œuvre que personne ne réclame ?',
  },
  {
    id: 'le-dernier-train',
    title: 'Le dernier train',
    medium: 'film',
    excerpt: 'Un road-movie ferroviaire qui ne va nulle part, magnifiquement.',
    cover: 'linear-gradient(150deg,#c56a3f,#8f3f24)',
    date: '26 février 2026',
    author: 'Marie-Zoé',
    likes: 31,
    comments: 5,
    status: 'published',
    views: 690,
    publishedAt: '2026-02-26',
    hook: 'Peut-on partir sans avoir de destination ?',
  },
  {
    id: 'chambre-noire',
    title: 'Chambre noire',
    medium: 'serie',
    excerpt: 'Un thriller en argentique, où chaque révélation prend du temps.',
    cover: 'linear-gradient(150deg,#5a7a86,#37525f)',
    date: '8 février 2026',
    author: 'Marie-Zoé',
    likes: 20,
    comments: 3,
    status: 'published',
    views: 470,
    publishedAt: '2026-02-08',
    hook: 'Et si l’image mettait des années à apparaître ?',
  },
  {
    id: 'l-hiver-des-autres',
    title: 'L’hiver des autres',
    medium: 'livre',
    excerpt: 'Une correspondance retrouvée, publiée telle quelle. C’est mieux ainsi.',
    cover: 'linear-gradient(150deg,#7a8c5a,#4f6138)',
    date: '21 janvier 2026',
    author: 'Marie-Zoé',
    likes: 17,
    comments: 2,
    status: 'published',
    views: 390,
    publishedAt: '2026-01-21',
    hook: 'Lit-on encore les lettres qui ne nous sont pas adressées ?',
  },
];

/**
 * The avis in progress. A draft has no `publishedAt` (it was never published)
 * and no audience figures yet — the listing renders an em dash for those and
 * shows `updatedLabel` in place of the hook.
 */
const DRAFTS: DraftArticle[] = [
  {
    id: 'contre-champs',
    title: 'Contre-champs',
    medium: 'doc',
    excerpt: 'Un documentaire sur les figurants, ceux qu’on ne regarde jamais.',
    cover: 'linear-gradient(150deg,#9a6a8a,#5f3a55)',
    date: '',
    author: 'Marie-Zoé',
    likes: 0,
    comments: 0,
    status: 'draft',
    views: 0,
    updatedLabel: 'Modifié il y a 2 jours',
  },
  {
    id: 'la-saison-des-orages',
    title: 'La saison des orages',
    medium: 'serie',
    excerpt: 'Une série météorologique, au sens le plus littéral du terme.',
    cover: 'linear-gradient(150deg,#6a8a96,#42606d)',
    date: '',
    author: 'Marie-Zoé',
    likes: 0,
    comments: 0,
    status: 'draft',
    views: 0,
    updatedLabel: 'Modifié il y a 6 jours',
  },
];

/**
 * The whole catalogue: drafts first (they are what the editor comes back to),
 * then every published avis newest-first. `articles` already dedupes the home
 * feed against the bilan avis, so an id appears exactly once.
 */
const CATALOGUE: Article[] = [
  ...DRAFTS,
  ...[...articles, ...OLDER_PUBLISHED].sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt),
  ),
];

/** Every avis, drafts first then published newest-first. */
export function adminArticles(): Article[] {
  return CATALOGUE;
}

/** Resolve an avis by id across the whole catalogue (undefined if unknown). */
export function adminArticleById(id: string): Article | undefined {
  if (!id) return undefined;
  return CATALOGUE.find((article) => article.id === id);
}

/** Catalogue totals for the page subtitle ("32 avis · 2 brouillons"). */
export function adminArticleCounts(): { total: number; drafts: number } {
  return {
    total: CATALOGUE.length,
    drafts: CATALOGUE.filter((article) => article.status === 'draft').length,
  };
}

/** The status segmented control. */
export function statusFilters(): Array<{ id: StatusFilter; label: string }> {
  return [
    { id: 'all', label: 'Tous' },
    { id: 'published', label: 'Publiés' },
    { id: 'draft', label: 'Brouillons' },
  ];
}

/** The medium dropdown — derived from MEDIA so route/label stay single-sourced. */
export function mediumFilters(): Array<{ id: MediumFilter; label: string }> {
  return [
    { id: 'all', label: 'Tous les médiums' },
    ...MEDIA.map((entry) => ({ id: entry.medium as MediumFilter, label: entry.label })),
  ];
}

/** The sort dropdown. */
export function sortOptions(): Array<{ id: SortId; label: string }> {
  return [
    { id: 'recent', label: 'Plus récents' },
    { id: 'oldest', label: 'Plus anciens' },
    { id: 'views', label: 'Plus vus' },
  ];
}

/**
 * The catalogue narrowed by status, medium and title search, then sorted.
 * Drafts always lead the list whatever the sort: they have no publication date
 * and no figures, so ordering them among published avis is meaningless.
 */
export function filterAdminArticles(query: ArticleQuery): Article[] {
  const needle = fold(query.search.trim());
  const matching = CATALOGUE.filter((article) => {
    if (query.status !== 'all' && article.status !== query.status) return false;
    if (query.medium !== 'all' && article.medium !== query.medium) return false;
    if (needle && !fold(article.title).includes(needle)) return false;
    return true;
  });

  const drafts = matching.filter((a): a is DraftArticle => a.status === 'draft');
  const published = matching.filter((a): a is PublishedArticle => a.status === 'published');
  published.sort((a, b) => {
    if (query.sort === 'views') return b.views - a.views;
    return query.sort === 'oldest'
      ? a.publishedAt.localeCompare(b.publishedAt)
      : b.publishedAt.localeCompare(a.publishedAt);
  });
  return [...drafts, ...published];
}
