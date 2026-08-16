/**
 * The content vocabulary of Clap et chapitre — the one place both sides agree on.
 *
 * Pure type declarations, no runtime code: `src/` reads them to render, and the
 * Pages Functions in `functions/` read them to shape what they return, so a
 * column that stops matching a field is a compile error rather than a silent
 * `undefined` in a hero.
 *
 * It lives outside `functions/_lib/` on purpose. That directory is deliberately
 * not shared with `src/` — code that touches JWT_SECRET should not be one import
 * away from client code — and this file is the opposite kind of thing: a
 * vocabulary with no secrets and no runtime, erased at compile time. Neither
 * tsconfig needs to list it: both pull it in transitively, the way
 * `tsconfig.json` already covers `functions/` through `src/test/api-server.ts`.
 *
 * Dates come in two flavours and never mix: a sortable ISO day ('2026-07-12') is
 * what the database stores and the wire carries; the French display string
 * ('12 juillet 2026') is built by `src/format.ts` at render time and is never
 * persisted.
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

/**
 * A published bilan, seen from a page that only ever renders live months. The
 * alias is frozen by contract DEV-19-05 — the Bilan components take it by name.
 */
export type MonthlyBilan = PublishedBilan;

/* -------------------------------------------------------------------------- *
 * The wire forms
 *
 * What the API carries, as opposed to what a component renders. They differ in
 * exactly one way: the types above hold French display strings ('18 juillet
 * 2026', 'Modifié il y a 2 jours'), the wire holds the ISO values those strings
 * are built from, and `src/api/map.ts` builds them on arrival.
 *
 * The split exists so the French formatting lives in one module, `src/format.ts`,
 * instead of being half in the client and half in a SQL SELECT. It also means a
 * stored date can never disagree with its own display copy, because there is no
 * display copy to store.
 * -------------------------------------------------------------------------- */

/** A live avis on the wire: same fields, ISO date, no rendered `date`. */
export type WirePublishedArticle = Omit<PublishedArticle, 'date'>;

/** A draft on the wire: the ISO edit time, not the "Modifié il y a…" line. */
export type WireDraftArticle = Omit<DraftArticle, 'date' | 'updatedLabel'> & {
  /** ISO timestamp of the last edit. */
  updatedAt: string;
};

export type WireArticle = WireDraftArticle | WirePublishedArticle;

export type WirePublishedBilan = Omit<PublishedBilan, 'avis'> & {
  avis: WirePublishedArticle[];
};

export type WireDraftBilan = Omit<DraftBilan, 'avis' | 'updatedLabel'> & {
  avis: WirePublishedArticle[];
  updatedAt: string;
};

export type WireBilan = WireDraftBilan | WirePublishedBilan;

/**
 * A comment on the wire. `date` is optional here and required after mapping:
 * an entry with no date is a real case — the author's replies wear a badge
 * instead — and `undefined` says that better than `''` does before rendering.
 */
export interface WireComment {
  id: string;
  author: string;
  body: string;
  isAuthor?: boolean;
  likes: number;
  /** ISO day, absent when the entry shows no date. */
  date?: string;
  reply?: WireComment;
}

/**
 * A comment on an article or bilan thread, with at most one nested reply.
 *
 * The single level of nesting is structural, not a limit we happened to stop at:
 * a reply carries no `reply` of its own in any design, and the thread renders it
 * as an indented answer rather than as a branch.
 */
export interface Comment {
  id: string;
  author: string;
  /** Display date, e.g. "13 juin 2026". Empty when the entry shows no date. */
  date: string;
  body: string;
  /** True when the comment is from the site author (Marie-Zoé). */
  isAuthor?: boolean;
  /** ♡ like count on this entry. */
  likes: number;
  /** The single nested reply, when there is one. */
  reply?: Comment;
}
