/**
 * JSON-LD builders. Kept out of the page components for the same reason
 * `src/api/map.ts` centralises the wire→render mapping: one place shapes the
 * data, so a schema.org field doesn't drift between two pages that both emit it.
 */
import type { Medium, PublishedArticle } from '../../shared/content';
import { SITE_URL } from './constants';

/**
 * schema.org type an avis's "itemReviewed" takes, by medium. schema.org has no
 * dedicated "Documentary" type — a documentary is a `Movie`, same as any film.
 */
const REVIEW_ITEM_TYPE: Record<Medium, string> = {
  film: 'Movie',
  serie: 'TVSeries',
  livre: 'Book',
  doc: 'Movie',
};

/**
 * A `Review` for one avis. Deliberately carries no `reviewRating` — `Article`
 * has no rating field, and structured data should not assert what the page
 * doesn't actually show.
 */
export function reviewSchema(article: PublishedArticle, image: string | undefined): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'Review',
    headline: article.title,
    reviewBody: article.excerpt,
    datePublished: article.publishedAt,
    author: { '@type': 'Person', name: article.author },
    itemReviewed: { '@type': REVIEW_ITEM_TYPE[article.medium], name: article.title },
    ...(image ? { image } : {}),
  };
}

export interface BreadcrumbItem {
  name: string;
  /** Site-relative path; joined with `SITE_URL` to form the absolute `item` URL. */
  path: string;
}

export function breadcrumbSchema(items: BreadcrumbItem[]): object {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}
