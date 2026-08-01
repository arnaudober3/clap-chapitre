/**
 * Shared mock content types for the Clap et chapitre prototype.
 * Pure type declarations — no runtime code. French mock data (author
 * Marie-Zoé) is authored by later subtasks against these shapes.
 */

/** The four media the site reviews. */
export type Medium = 'film' | 'serie' | 'livre' | 'doc';

/**
 * The fields every avis carries, whatever its publication state. Internal —
 * consumers take `Article`, or `DraftArticle` / `PublishedArticle` when the
 * state is known.
 */
interface BaseArticle {
  id: string;
  title: string;
  medium: Medium;
  /** Short teaser shown in feeds and cards. */
  excerpt: string;
  /** Cover art reference — a CSS gradient placeholder for now. */
  cover: string;
  /** Display date, e.g. "12 juin 2026". */
  date: string;
  author: string;
  /** ♡ like count — shown on every card and the hero. */
  likes: number;
  /** Comment count — shown on every card and the hero. */
  comments: number;
  /** View count. Not surfaced publicly — the admin listing shows it. */
  views: number;
  /** Italic question line under the title (hero uses it). */
  hook?: string;
  /** The "Pour ceux qui…" one-liner (hero uses it). */
  forThoseWho?: string;
  /** Full body copy — only present on the article view. */
  body?: string;
  /** "À rapprocher de" callout — a related work (Bilan uses it). */
  relatedTo?: { title: string; note: string };
  /** Meta line under the medium label, e.g. "Comédie dramatique · 2 h 04 · 2026". */
  genreMeta?: string;
  /** Reading time, e.g. "4 min de lecture". */
  readingTime?: string;
  /** The mid-body pull quote (rendered with the gold rule). */
  pullQuote?: string;
  /** "À rapprocher de" — ids of up to 2 other avis + why they're close. */
  related?: Array<{ id: string; note: string }>;
}

/** An avis still being written: no publication date, but a "last edited" line. */
export interface DraftArticle extends BaseArticle {
  status: 'draft';
  /** e.g. "Modifié il y a 2 jours". */
  updatedLabel: string;
}

/** A live avis — the only kind the public site ever renders. */
export interface PublishedArticle extends BaseArticle {
  status: 'published';
  /** Sortable ISO date, '2026-07-12'. */
  publishedAt: string;
}

/** Any avis. Narrow on `status` to reach the state-specific fields. */
export type Article = DraftArticle | PublishedArticle;

/**
 * The fields every monthly bilan carries, whatever its publication state.
 * Internal — consumers take `Bilan`, or `DraftBilan` / `PublishedBilan` when the
 * state is known. Mirrors the article hierarchy above.
 */
interface BaseBilan {
  /** 'YYYY-MM', e.g. '2026-06'. */
  id: string;
  year: number;
  /** 1–12. */
  month: number;
  /** 'Juin'. */
  monthLabel: string;
  /** Editorial title, e.g. "Juin 2026 — les longues soirées". */
  title: string;
  /** "L'humeur du mois" — the Bilan page renders it in full, listings truncate. */
  mood?: string;
  /** The month's reviews. Empty on the months only the admin listing shows. */
  avis: PublishedArticle[];
  /** Œuvres per medium — the listing's chips. Kept explicit because the
      archive months carry no detailed `avis` to count. */
  counts: Partial<Record<Medium, number>>;
  /** View count. Not surfaced publicly — the admin listing shows it. */
  views: number;
  /** ♡ like count on the bilan itself. */
  likes: number;
}

/** A bilan still being written: no publication date, but a "last edited" line. */
export interface DraftBilan extends BaseBilan {
  status: 'draft';
  /** e.g. "Modifié il y a 2 jours". */
  updatedLabel: string;
}

/** A live bilan — the only kind the public site ever renders. */
export interface PublishedBilan extends BaseBilan {
  status: 'published';
  /** Sortable ISO date, '2026-07-02'. */
  publishedAt: string;
}

/** Any bilan. Narrow on `status` to reach the state-specific fields. */
export type Bilan = DraftBilan | PublishedBilan;

/** A comment on an article / bilan thread. */
export interface Comment {
  id: string;
  author: string;
  /** Display date, e.g. "13 juin 2026". */
  date: string;
  body: string;
  /** True when the comment is from the site author (Marie-Zoé). */
  isAuthor?: boolean;
}
