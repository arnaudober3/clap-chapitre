/**
 * Every write the site performs, in one place.
 *
 * The mirror of `content.ts` and `admin.ts`, which hold every read. Same reason
 * for existing: a page should not build a URL or decide whether a request
 * carries the admin token. Unlike the reads these are plain functions rather
 * than hooks — a write happens on a click, not on a render — and `useMutation`
 * is what wraps them when a screen needs pending and error state.
 *
 * They take and return wire shapes: ISO in, ISO out. No French display string
 * ever travels up, which is the same contract `map.ts` enforces on the way down.
 */
import { apiSend, apiUpload } from './client';
import type { Medium } from '../../shared/content';

const ADMIN = { admin: true } as const;

/* -------------------------------------------------------------------------- *
 * Payload shapes
 *
 * Declared here rather than in `shared/content.ts` because they are not the
 * content vocabulary — they are what the *forms* send, which is a smaller and
 * differently-shaped thing than what the API returns. `WireArticle` carries
 * likes, views and a comment count; none of those are the editor's to set.
 * -------------------------------------------------------------------------- */

export interface ArticlePayload {
  title: string;
  medium: Medium;
  excerpt: string;
  /** R2 key, or '' for "no affiche yet". */
  cover: string;
  status: 'draft' | 'published';
  hook?: string;
  forThoseWho?: string;
  body?: string;
  genreMeta?: string;
  readingTime?: string;
  pullQuote?: string;
  relatedToTitle?: string;
  relatedToNote?: string;
  related?: Array<{ id: string; note: string }>;
}

export interface BilanCardPayload {
  id: string;
  title: string;
  excerpt: string;
  hook?: string;
  forThoseWho?: string;
  body?: string;
  relatedToTitle?: string;
  relatedToNote?: string;
}

export interface BilanPayload {
  /** 'AAAA-MM'. */
  id: string;
  monthLabel: string;
  title: string;
  mood?: string;
  status: 'draft' | 'published';
  /** The selection, in editorial order — the order is the data. */
  avis: string[];
  edits: BilanCardPayload[];
}

/* -------------------------------------------------------------------------- *
 * Avis
 * -------------------------------------------------------------------------- */

/** Creates an avis. The id is derived from the title server-side. */
export function createArticle(payload: ArticlePayload): Promise<{ id: string }> {
  return apiSend<{ id: string }>('/api/admin/articles', 'POST', payload, ADMIN);
}

export function updateArticle(id: string, payload: ArticlePayload): Promise<{ id: string }> {
  return apiSend<{ id: string }>(
    `/api/admin/articles/${encodeURIComponent(id)}`,
    'PUT',
    payload,
    ADMIN,
  );
}

export function deleteArticle(id: string): Promise<void> {
  return apiSend<void>(`/api/admin/articles/${encodeURIComponent(id)}`, 'DELETE', undefined, ADMIN);
}

/** Create or replace, depending on whether the form is editing something. */
export function saveArticle(
  id: string | undefined,
  payload: ArticlePayload,
): Promise<{ id: string }> {
  return id ? updateArticle(id, payload) : createArticle(payload);
}

/* -------------------------------------------------------------------------- *
 * Bilans
 * -------------------------------------------------------------------------- */

export function createBilan(payload: BilanPayload): Promise<{ id: string }> {
  return apiSend<{ id: string }>('/api/admin/bilans', 'POST', payload, ADMIN);
}

export function updateBilan(id: string, payload: BilanPayload): Promise<{ id: string }> {
  return apiSend<{ id: string }>(
    `/api/admin/bilans/${encodeURIComponent(id)}`,
    'PUT',
    payload,
    ADMIN,
  );
}

export function deleteBilan(id: string): Promise<void> {
  return apiSend<void>(`/api/admin/bilans/${encodeURIComponent(id)}`, 'DELETE', undefined, ADMIN);
}

export function saveBilan(id: string | undefined, payload: BilanPayload): Promise<{ id: string }> {
  return id ? updateBilan(id, payload) : createBilan(payload);
}

/* -------------------------------------------------------------------------- *
 * Editorial pages
 *
 * PUT only, and no id: both rows are singletons (`CHECK (id = 1)`), so the
 * endpoints upsert and there is nothing for the client to decide.
 * -------------------------------------------------------------------------- */

export function saveApropos(payload: unknown): Promise<{ ok: true }> {
  return apiSend<{ ok: true }>('/api/admin/pages/apropos', 'PUT', payload, ADMIN);
}

export function saveMeSuivre(payload: unknown): Promise<{ ok: true }> {
  return apiSend<{ ok: true }>('/api/admin/pages/me-suivre', 'PUT', payload, ADMIN);
}

/* -------------------------------------------------------------------------- *
 * Images
 * -------------------------------------------------------------------------- */

/**
 * Uploads a file and answers the key to store. The bytes go up raw with the
 * file's own content type — no multipart envelope for a single file.
 */
export function uploadImage(
  file: File,
  kind: 'cover' | 'portrait' = 'cover',
): Promise<{ key: string }> {
  return apiUpload<{ key: string }>(`/api/admin/uploads?kind=${kind}`, file, ADMIN);
}

/** The URL a stored key renders at. '' stays '' so a caller can test for it. */
export function mediaUrl(key: string): string {
  return key ? `/api/media/${encodeURIComponent(key)}` : '';
}

/**
 * The inline style that paints a cover, wherever one appears.
 *
 * There are seven of these — the hero, the cards, the grids, the newsletter
 * preview — and they all used to be `style={{ background: item.cover }}`, which
 * worked while a cover *was* a CSS gradient. A key is not a gradient, so every
 * one of them would silently paint nothing. Naming the conversion once is what
 * keeps the eighth from getting it wrong.
 *
 * The framing travels with the URL rather than living in six stylesheets: a
 * cover tile that got `background-image` but not `background-size` would show
 * one corner of the poster, and the next place to render one would have to
 * remember all three properties.
 *
 * `undefined` when there is no image, so the tile's own stylesheet supplies the
 * neutral placeholder instead of this inventing one.
 */
export interface CoverStyle {
  backgroundImage: string;
  backgroundSize: 'cover';
  backgroundPosition: 'center';
}

export function coverStyle(key: string): CoverStyle | undefined {
  const url = mediaUrl(key.trim());
  if (!url) return undefined;
  return {
    backgroundImage: `url(${url})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };
}

/* -------------------------------------------------------------------------- *
 * Moderation
 * -------------------------------------------------------------------------- */

export function approveComment(id: string): Promise<{ id: string }> {
  return apiSend<{ id: string }>(
    `/api/admin/comments/${encodeURIComponent(id)}`,
    'PUT',
    { status: 'approved' },
    ADMIN,
  );
}

export function deleteComment(id: string): Promise<void> {
  return apiSend<void>(`/api/admin/comments/${encodeURIComponent(id)}`, 'DELETE', undefined, ADMIN);
}

/* -------------------------------------------------------------------------- *
 * Public writes — no token, and the only two anonymous callers can reach
 * -------------------------------------------------------------------------- */

export interface CommentPayload {
  targetType: 'article' | 'bilan';
  targetId: string;
  author: string;
  body: string;
  parentId?: string;
  /** The honeypot. Always sent, always empty when a human filled the form. */
  trap: string;
  /** When the composer mounted — the server refuses anything faster than 3 s. */
  openedAt: number;
}

/**
 * Posts a comment. Answers `{ queued: true }` and nothing else: the comment is
 * in moderation and there is no row anyone may render yet.
 */
export function postComment(payload: CommentPayload): Promise<{ queued: true }> {
  return apiSend<{ queued: true }>('/api/comments', 'POST', payload);
}

/** Toggles a ♡. Answers the recomputed count and whether this caller is in it. */
export function toggleLike(
  targetType: 'article' | 'bilan' | 'comment',
  targetId: string,
): Promise<{ likes: number; liked: boolean }> {
  return apiSend<{ likes: number; liked: boolean }>('/api/likes', 'POST', {
    targetType,
    targetId,
  });
}
