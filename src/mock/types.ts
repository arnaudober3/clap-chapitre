/**
 * Shared mock content types for the Clap et chapitre prototype.
 * Pure type declarations — no runtime code. French mock data (author
 * Marie-Zoé) is authored by later subtasks against these shapes.
 */

/** The four media the site reviews. */
export type Medium = 'film' | 'serie' | 'livre' | 'doc';

/** A single review / "avis" entry. */
export interface Article {
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
  /** Italic question line under the title (hero uses it). */
  hook?: string;
  /** The "Pour ceux qui…" one-liner (hero uses it). */
  forThoseWho?: string;
  /** Full body copy — only present on the article view. */
  body?: string;
  /** "À rapprocher de" callout — a related work (Bilan uses it). */
  relatedTo?: { title: string; note: string };
}

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
