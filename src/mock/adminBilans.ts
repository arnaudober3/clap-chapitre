/**
 * The admin bilan catalogue — every monthly bilan Marie-Zoé has written,
 * published or not. It is the same `Bilan` model the public site renders: the
 * months exposed by `bilans.ts` are literally the ones listed here (same ids),
 * and this module only adds what the public bilan pages never showed — the
 * older months, kept as headline + figures without their detailed avis, and the
 * month currently being written.
 *
 * Static French mock content, no network. Selectors are pure functions (no
 * React, no module-level mutable state), mirroring adminArticles.ts.
 */
import type { Bilan, DraftBilan, PublishedArticle, PublishedBilan } from './types';
import { bilans } from './bilans';
import { adminArticles } from './adminArticles';
import { fold, monthName } from '../format';

/** The listing sort orders. */
export type BilanSortId = 'recent' | 'oldest' | 'views';

/** The full listing query — one object so the page threads a single state. */
export interface BilanQuery {
  search: string;
  sort: BilanSortId;
}

/** Rows per listing page — the design shows "7 bilans sur 14". */
export const PAGE_SIZE = 7;

/** The listing's starting query: everything, newest first. */
export const DEFAULT_QUERY: BilanQuery = {
  search: '',
  sort: 'recent',
};

/**
 * The months that predate the public bilan pages. They carry the headline, the
 * per-medium tally and the audience the listing shows, but no detailed `avis` —
 * only the months `bilans.ts` exposes render a full page.
 */
const OLDER_PUBLISHED: PublishedBilan[] = [
  {
    id: '2026-03',
    year: 2026,
    month: 3,
    monthLabel: 'Mars',
    title: 'La saison des salles vides',
    mood: 'Trois séances seule, et c’était bien.',
    avis: [],
    counts: { film: 6, livre: 2 },
    views: 1880,
    likes: 76,
    status: 'published',
    publishedAt: '2026-04-01',
  },
  {
    id: '2026-02',
    year: 2026,
    month: 2,
    monthLabel: 'Février',
    title: 'Le mois le plus court, les films les plus longs',
    mood: 'Quatre heures de projection un dimanche, sans regret.',
    avis: [],
    counts: { film: 3, serie: 2, doc: 1 },
    views: 1640,
    likes: 71,
    status: 'published',
    publishedAt: '2026-03-02',
  },
  {
    id: '2026-01',
    year: 2026,
    month: 1,
    monthLabel: 'Janvier',
    title: 'Les bonnes résolutions de lecture',
    mood: 'On avait promis un livre par semaine. On en a tenu trois.',
    avis: [],
    counts: { livre: 4, serie: 2 },
    views: 2050,
    likes: 84,
    status: 'published',
    publishedAt: '2026-02-02',
  },
  {
    id: '2025-10',
    year: 2025,
    month: 10,
    monthLabel: 'Octobre',
    title: 'Tout ce qui fait peur',
    mood: 'Un mois d’épouvante assumée, fenêtres fermées.',
    avis: [],
    counts: { film: 5, serie: 3 },
    views: 2480,
    likes: 103,
    status: 'published',
    publishedAt: '2025-11-03',
  },
  {
    id: '2025-09',
    year: 2025,
    month: 9,
    monthLabel: 'Septembre',
    title: 'La rentrée en retard',
    mood: 'On a repris le rythme la dernière semaine, comme toujours.',
    avis: [],
    counts: { livre: 3, doc: 2, film: 1 },
    views: 1720,
    likes: 69,
    status: 'published',
    publishedAt: '2025-10-01',
  },
  {
    id: '2025-08',
    year: 2025,
    month: 8,
    monthLabel: 'Août',
    title: 'Lire à l’ombre',
    mood: 'Six livres, deux transats, aucun écran.',
    avis: [],
    counts: { livre: 6 },
    views: 1410,
    likes: 58,
    status: 'published',
    publishedAt: '2025-09-01',
  },
  {
    id: '2025-07',
    year: 2025,
    month: 7,
    monthLabel: 'Juillet',
    title: 'Plein soleil, salle obscure',
    mood: 'La climatisation du cinéma valait bien le prix de la place.',
    avis: [],
    counts: { film: 4, serie: 2, livre: 1 },
    views: 1290,
    likes: 52,
    status: 'published',
    publishedAt: '2025-08-01',
  },
  {
    id: '2025-06',
    year: 2025,
    month: 6,
    monthLabel: 'Juin',
    title: 'Les séries qu’on regarde à deux',
    mood: 'On a fini trois saisons sans jamais avancer seule.',
    avis: [],
    counts: { serie: 4, doc: 1 },
    views: 980,
    likes: 41,
    status: 'published',
    publishedAt: '2025-07-02',
  },
  {
    id: '2025-05',
    year: 2025,
    month: 5,
    monthLabel: 'Mai',
    title: 'Le tout premier bilan',
    mood: 'On ne savait pas encore que ça deviendrait un rendez-vous.',
    avis: [],
    counts: { film: 2, livre: 2 },
    views: 640,
    likes: 27,
    status: 'published',
    publishedAt: '2025-06-02',
  },
];

/**
 * The month being written. A draft has no `publishedAt` and no audience yet —
 * the listing shows its `updatedLabel` where a published month shows its date,
 * and an "En cours" pill instead of "Publié". Its tally counts the coups de
 * cœur already written, exactly like a published month's.
 */
const CURRENT_DRAFT: DraftBilan = {
  id: '2026-07',
  year: 2026,
  month: 7,
  monthLabel: 'Juillet',
  title: 'Un mois à contre-courant',
  mood: 'L’humeur du mois : lente, un peu têtue, et très bien accompagnée.',
  counts: { film: 1, serie: 1, livre: 1 },
  views: 0,
  likes: 0,
  status: 'draft',
  updatedLabel: 'modifié il y a 2 jours',
  avis: [
    {
      id: 'bilan-2026-07-la-traversee-de-juillet',
      title: 'La traversée de juillet',
      medium: 'film',
      excerpt:
        'Deux heures de marche à contre-courant, filmées à hauteur de chaussures.',
      cover: 'linear-gradient(150deg,#c56a3f,#8f3f24)',
      date: '9 juillet 2026',
      author: 'Marie-Zoé',
      likes: 0,
      comments: 0,
      views: 0,
      status: 'published',
      publishedAt: '2026-07-09',
      hook: 'Faut-il vraiment arriver quelque part pour que le voyage compte ?',
      body: 'Un homme quitte la ville un matin de juillet et se met à marcher, sans destination annoncée. Le film ne cherche jamais à nous expliquer pourquoi.\n\nOn le suit trois semaines durant, au rythme de ses chaussures et des rencontres qui s’imposent : une buraliste bavarde, un adolescent qui fugue mal, une route départementale qui n’en finit pas. La caméra reste basse, obstinément, comme si elle refusait de prendre de la hauteur sur le personnage.\n\nJ’ai failli décrocher au milieu, puis j’ai compris que l’ennui faisait partie du trajet. La dernière demi-heure m’a cueillie : il n’arrive nulle part, et c’est exactement le propos.',
      relatedTo: {
        title: 'La lumière du Nord',
        note: 'le paysage comme personnage principal.',
      },
      forThoseWho:
        'Pour ceux qui acceptent qu’un film prenne son temps et ne referme rien à la fin.',
    },
    {
      id: 'bilan-2026-07-les-heures-creuses',
      title: 'Les heures creuses',
      medium: 'serie',
      excerpt:
        'Huit épisodes dans un centre d’appels de nuit, drôles et désespérés à parts égales.',
      cover: 'linear-gradient(150deg,#6a8a96,#42606d)',
      date: '18 juillet 2026',
      author: 'Marie-Zoé',
      likes: 0,
      comments: 0,
      views: 0,
      status: 'published',
      publishedAt: '2026-07-18',
      hook: 'Qui écoute ceux dont le métier est d’écouter ?',
      body: 'Une équipe de nuit, un plateau téléphonique, et huit épisodes d’une demi-heure qui ne quittent presque jamais l’open space.\n\nOn craint le huis clos poussif, on tombe sur une comédie sociale d’une justesse rare. Chaque appel entrant ouvre une fenêtre sur une vie qu’on ne verra jamais, et chaque pause cigarette referme un peu plus les personnages sur eux-mêmes.\n\nLe sixième épisode, tourné en un seul plan de vingt-huit minutes, est le meilleur moment de télévision que j’aie vu cette année. La fin de saison m’a laissée en colère, ce qui est sans doute le but.',
      relatedTo: {
        title: 'Ceux qui restent',
        note: 'la même tendresse pour les gens fatigués.',
      },
      forThoseWho:
        'Pour ceux qui aiment rire d’un monde du travail montré sans caricature.',
    },
    {
      id: 'bilan-2026-07-contre-courant',
      title: 'Contre-courant',
      medium: 'livre',
      excerpt:
        'Deux cents pages de nage à rebours, dans une langue sèche et magnifique.',
      cover: 'linear-gradient(150deg,#8ea06a,#5b6d40)',
      date: '24 juillet 2026',
      author: 'Marie-Zoé',
      likes: 0,
      comments: 0,
      views: 0,
      status: 'published',
      publishedAt: '2026-07-24',
      hook: 'Peut-on rentrer chez soi quand on a passé sa vie à en partir ?',
      body: 'Une nageuse de fond revient dans le village fluvial où elle a grandi, pour vider la maison de sa mère. Elle y reste l’été entier.\n\nLe roman avance comme elle nage : régulièrement, obstinément, sans effet de manche. La rivière traverse tout le livre — on y apprend à nager, on s’y noie un peu, on y disperse des cendres.\n\nJ’ai relu trois fois le chapitre de la crue. L’autrice y fait tenir en dix pages tout ce que le reste du roman contourne avec pudeur : la colère d’une fille envers une mère qui n’a jamais su rester. C’est court, c’est net, et ça ne s’excuse jamais.',
      relatedTo: {
        title: 'Le jardin suspendu',
        note: 'la nature qui dit ce que les personnages taisent.',
      },
      forThoseWho:
        'Pour ceux qui cherchent un roman de retour au pays sans une once de nostalgie.',
    },
  ],
};

/**
 * Every published month, newest-first. The public `bilans` and the archive
 * months never overlap, so an id appears exactly once.
 */
const PUBLISHED: PublishedBilan[] = [...bilans, ...OLDER_PUBLISHED].sort((a, b) =>
  b.publishedAt.localeCompare(a.publishedAt),
);

/** Every bilan, draft included — the draft leads, then the months newest-first. */
const CATALOGUE: Bilan[] = [CURRENT_DRAFT, ...PUBLISHED];

/** Every bilan, published or not. */
export function adminBilans(): Bilan[] {
  return CATALOGUE;
}

/** The month currently being written, if there is one. */
export function currentDraftBilan(): DraftBilan | undefined {
  return CURRENT_DRAFT;
}

/** Resolve a bilan by its 'YYYY-MM' id across the whole catalogue. */
export function adminBilanById(id: string): Bilan | undefined {
  if (!id) return undefined;
  return CATALOGUE.find((bilan) => bilan.id === id);
}

/**
 * The month a new bilan would cover: the one right after the most recent month
 * already in the catalogue. A bilan is monthly and the catalogue has no gap, so
 * "the next free month" is simply "the month after the last one" — no clock
 * involved, which keeps the prototype deterministic.
 */
export function nextBilanMonth(): { id: string; year: number; month: number; monthLabel: string } {
  const latest = CATALOGUE.reduce((a, b) => (a.id > b.id ? a : b));
  const month = latest.month === 12 ? 1 : latest.month + 1;
  const year = latest.month === 12 ? latest.year + 1 : latest.year;
  return { id: `${year}-${String(month).padStart(2, '0')}`, year, month, monthLabel: monthName(month) };
}

/**
 * Catalogue totals for the page headers: "14 bilans publiés · depuis mai 2025"
 * on desktop, "14 publiés · 1 en cours" in the mobile top bar.
 */
export function adminBilanCounts(): { published: number; drafts: number; sinceLabel: string } {
  const oldest = PUBLISHED[PUBLISHED.length - 1];
  return {
    published: PUBLISHED.length,
    drafts: CATALOGUE.filter((bilan) => bilan.status === 'draft').length,
    sinceLabel: oldest ? `${oldest.monthLabel.toLowerCase()} ${oldest.year}` : '—',
  };
}

/** The sort dropdown. */
export function bilanSortOptions(): Array<{ id: BilanSortId; label: string }> {
  return [
    { id: 'recent', label: 'Plus récents' },
    { id: 'oldest', label: 'Plus anciens' },
    { id: 'views', label: 'Plus vus' },
  ];
}

/**
 * What the listing search reads on a bilan: its month, its year and its
 * editorial title. The month is part of it because a bilan *is* a month —
 * "février" is how one looks a bilan up, and the title no longer spells it.
 */
function searchable(bilan: Bilan): string {
  return fold(`${bilan.monthLabel} ${bilan.year} ${bilan.title}`);
}

/**
 * The published months narrowed by the search, then sorted. The month in
 * progress is never part of the result: the page gives it a card of its own
 * above the listing, where it is far easier to tell apart than as one row among
 * fourteen.
 */
export function filterAdminBilans(query: BilanQuery): PublishedBilan[] {
  const needle = fold(query.search.trim());
  const matching = PUBLISHED.filter(
    (bilan) => !needle || searchable(bilan).includes(needle),
  );

  return [...matching].sort((a, b) => {
    if (query.sort === 'views') return b.views - a.views;
    return query.sort === 'oldest'
      ? a.publishedAt.localeCompare(b.publishedAt)
      : b.publishedAt.localeCompare(a.publishedAt);
  });
}

/** The two lists the "Ajouter un coup de cœur" picker offers. */
export interface AvisPicker {
  /** Published avis of the bilan's month, newest-first. Shown in full. */
  thisMonth: PublishedArticle[];
  /** Every other published avis, newest-first. Revealed a batch at a time. */
  catalogue: PublishedArticle[];
}

/**
 * The avis a bilan can highlight: existing published reviews, never new ones. A
 * coup de cœur points at an avis that is already online, so drafts are left out.
 * The month's own avis lead — they are the obvious picks — and everything else
 * follows so the author is never boxed into a single month. `taken` (the ids
 * already in the bilan) drops out of both, so nothing can be added twice.
 */
export function avisForBilanPicker(monthId: string, taken: string[]): AvisPicker {
  const held = new Set(taken);
  const available = adminArticles()
    .filter((avis): avis is PublishedArticle => avis.status === 'published')
    .filter((avis) => !held.has(avis.id))
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));

  return {
    thisMonth: available.filter((avis) => avis.publishedAt.startsWith(monthId)),
    catalogue: available.filter((avis) => !avis.publishedAt.startsWith(monthId)),
  };
}
