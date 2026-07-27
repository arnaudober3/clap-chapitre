import { describe, it, expect } from 'vitest';
import {
  adminArticles,
  adminArticleById,
  adminArticleCounts,
  filterAdminArticles,
  statusFilters,
  mediumFilters,
  sortOptions,
  DEFAULT_QUERY,
  PAGE_SIZE,
  type ArticleQuery,
} from '../mock/adminArticles';
import { articles } from '../mock/articles';
import type { PublishedArticle } from '../mock/types';
import { MEDIA } from '../media';

function query(patch: Partial<ArticleQuery> = {}): ArticleQuery {
  return { ...DEFAULT_QUERY, ...patch };
}

describe('AA-1 admin catalogue', () => {
  it('holds the whole catalogue: 32 avis, 2 of them drafts', () => {
    const counts = adminArticleCounts();
    expect(counts.total).toBe(32);
    expect(counts.drafts).toBe(2);
    expect(adminArticles()).toHaveLength(counts.total);
  });

  it('shares the public Article model — every published avis keeps its id', () => {
    for (const article of articles) {
      const admin = adminArticleById(article.id);
      expect(admin).toBeDefined();
      expect(admin!.title).toBe(article.title);
      expect(admin!.medium).toBe(article.medium);
      expect(admin!.status).toBe('published');
    }
  });

  it('gives every entry a status and a view count, and drafts no publication date', () => {
    for (const article of adminArticles()) {
      expect(['published', 'draft']).toContain(article.status);
      expect(typeof article.views).toBe('number');
      if (article.status === 'draft') {
        // The union keeps publishedAt off a draft entirely.
        expect(article).not.toHaveProperty('publishedAt');
        expect(article.updatedLabel).toBeTruthy();
      } else {
        expect(article.publishedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    }
  });

  it('resolves an avis by id and returns undefined for an unknown/empty one', () => {
    expect(adminArticleById('un-dernier-ete')?.title).toBe('Un dernier été');
    expect(adminArticleById('nope')).toBeUndefined();
    expect(adminArticleById('')).toBeUndefined();
  });
});

describe('AA-1 filtering', () => {
  it('filters by status', () => {
    const drafts = filterAdminArticles(query({ status: 'draft' }));
    expect(drafts).toHaveLength(adminArticleCounts().drafts);
    expect(drafts.every((article) => article.status === 'draft')).toBe(true);

    const published = filterAdminArticles(query({ status: 'published' }));
    expect(published.every((article) => article.status === 'published')).toBe(true);
    expect(published.length + drafts.length).toBe(adminArticleCounts().total);
  });

  it('filters by medium', () => {
    for (const entry of MEDIA) {
      const rows = filterAdminArticles(query({ medium: entry.medium }));
      expect(rows.length).toBeGreaterThan(0);
      expect(rows.every((article) => article.medium === entry.medium)).toBe(true);
    }
  });

  it('searches titles case- and accent-insensitively', () => {
    const titles = filterAdminArticles(query({ search: 'ETE' })).map((a) => a.title);
    expect(titles).toContain('Un dernier été');
    expect(filterAdminArticles(query({ search: '  été ' })).map((a) => a.title)).toContain(
      'Un dernier été',
    );
    expect(filterAdminArticles(query({ search: 'zzz' }))).toHaveLength(0);
  });

  it('combines filters', () => {
    const rows = filterAdminArticles(query({ status: 'published', medium: 'film', search: 'la' }));
    expect(rows.length).toBeGreaterThan(0);
    expect(
      rows.every(
        (article) =>
          article.status === 'published' &&
          article.medium === 'film' &&
          article.title.toLowerCase().includes('la'),
      ),
    ).toBe(true);
  });
});

describe('AA-1 sorting', () => {
  it('always leads with the drafts', () => {
    for (const sort of sortOptions()) {
      const rows = filterAdminArticles(query({ sort: sort.id }));
      expect(rows.slice(0, 2).every((article) => article.status === 'draft')).toBe(true);
    }
  });

  it('orders published avis by date or by views', () => {
    const published = (sort: ArticleQuery['sort']) =>
      filterAdminArticles(query({ status: 'published', sort })).filter(
        (a): a is PublishedArticle => a.status === 'published',
      );

    const recent = published('recent').map((a) => a.publishedAt);
    expect([...recent].sort((a, b) => b.localeCompare(a))).toEqual(recent);

    const oldest = published('oldest').map((a) => a.publishedAt);
    expect([...oldest].sort((a, b) => a.localeCompare(b))).toEqual(oldest);

    const views = published('views').map((a) => a.views);
    expect([...views].sort((a, b) => b - a)).toEqual(views);
  });
});

describe('AA-1 listing options', () => {
  it('exposes the status, medium and sort options the toolbar renders', () => {
    expect(statusFilters().map((f) => f.id)).toEqual(['all', 'published', 'draft']);
    // The medium dropdown is derived from MEDIA, plus the "everything" entry.
    expect(mediumFilters().map((f) => f.id)).toEqual(['all', ...MEDIA.map((m) => m.medium)]);
    expect(sortOptions().map((s) => s.id)).toEqual(['recent', 'oldest', 'views']);
  });

  it('pages seven rows at a time, as the design shows', () => {
    expect(PAGE_SIZE).toBe(7);
    expect(DEFAULT_QUERY).toEqual({ status: 'all', medium: 'all', search: '', sort: 'recent' });
  });
});
