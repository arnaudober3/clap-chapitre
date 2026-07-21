/**
 * Article resolver for the single-avis view (`/article/:id`). An id can come
 * from either source — the home feed (its cards link to `/article/<feed id>`)
 * or a monthly bilan (its avis carry their own ids) — so this module unions
 * both into one ordered, id-deduped list and exposes pure selectors on top of
 * it. No React, no module-level mutable state, no I/O; `src/mock/bilans.ts` and
 * `src/mock/home.ts` are read-only here.
 */
import type { Article } from './types';
import { feed } from './home';
import { bilans, type MonthlyBilan } from './bilans';

/**
 * Every avis, deduped by id: the home feed first (in feed order), then all
 * bilan avis (bilans newest-first, avis in their bilan order). The first
 * occurrence of an id wins, so a feed entry shadows a bilan entry.
 */
export const articles: Article[] = (() => {
  const seen = new Set<string>();
  const all: Article[] = [];
  for (const article of [
    ...feed,
    ...bilans.flatMap((bilan) => bilan.avis),
  ]) {
    if (seen.has(article.id)) continue;
    seen.add(article.id);
    all.push(article);
  }
  return all;
})();

/** Resolve an avis by id. Returns undefined for an unknown/empty id. */
export function articleById(id: string): Article | undefined {
  if (!id) return undefined;
  return articles.find((article) => article.id === id);
}

/**
 * The neighbours of `id` in `articles` order, for the prev/next cards. The
 * first article has no `prev`, the last has no `next`, and an unknown id has
 * neither — a neighbour is never the article itself.
 */
export function articleNeighbours(id: string): {
  prev?: Article;
  next?: Article;
} {
  const index = articles.findIndex((article) => article.id === id);
  if (index === -1) return {};
  return {
    prev: index > 0 ? articles[index - 1] : undefined,
    next: index < articles.length - 1 ? articles[index + 1] : undefined,
  };
}

/**
 * Resolves `article.related` ids to Articles, carrying each entry's note.
 * Unknown ids, self-references and repeats are dropped silently; at most 2 are
 * returned. An article with no `related` resolves to an empty list.
 */
export function relatedArticles(
  article: Article,
): Array<Article & { note: string }> {
  if (!article.related) return [];
  const resolved: Array<Article & { note: string }> = [];
  const seen = new Set<string>();
  for (const entry of article.related) {
    if (resolved.length === 2) break;
    if (entry.id === article.id || seen.has(entry.id)) continue;
    const target = articleById(entry.id);
    if (!target) continue;
    seen.add(target.id);
    resolved.push({ ...target, note: entry.note });
  }
  return resolved;
}

/**
 * The bilan an avis belongs to, for the breadcrumb. Undefined for a feed-only
 * avis (or an unknown id).
 */
export function bilanForArticle(id: string): MonthlyBilan | undefined {
  if (!id) return undefined;
  return bilans.find((bilan) => bilan.avis.some((avis) => avis.id === id));
}
