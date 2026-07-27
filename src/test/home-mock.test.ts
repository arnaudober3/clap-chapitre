import { describe, it, expect, expectTypeOf } from 'vitest';
import type { PublishedArticle, Medium } from '../mock/types';
import { feed, latestFor, recentFor } from '../mock/home';

const MEDIA: Medium[] = ['film', 'serie', 'livre', 'doc'];

describe('HM-1 Article type extension', () => {
  it('carries likes/comments (required) and hook/forThoseWho (optional)', () => {
    const article: PublishedArticle = {
      id: 'a1',
      title: 'Un dernier été',
      medium: 'film',
      excerpt: 'Un huis clos solaire.',
      cover: 'linear-gradient(150deg,#c56a3f,#8f3f24)',
      date: '18 juillet 2026',
      author: 'Marie-Zoé',
      likes: 10,
      comments: 2,
      status: 'published',
      publishedAt: '2026-06-12',
      views: 420,
      hook: 'Et si ?',
      forThoseWho: 'Pour ceux qui aiment.',
    };
    expect(article.likes).toBe(10);
    expect(article.comments).toBe(2);
    expectTypeOf<PublishedArticle['likes']>().toEqualTypeOf<number>();
    expectTypeOf<PublishedArticle['comments']>().toEqualTypeOf<number>();
    expectTypeOf<PublishedArticle['hook']>().toEqualTypeOf<string | undefined>();
    expectTypeOf<PublishedArticle['forThoseWho']>().toEqualTypeOf<string | undefined>();
  });
});

describe('HM-1 home feed', () => {
  it('has at least one item per medium', () => {
    for (const m of MEDIA) {
      expect(feed.some((item) => item.medium === m)).toBe(true);
    }
  });

  it('has enough items for a hero plus a 3-card grid on /', () => {
    // hero (1) + at least 3 grid cards
    expect(feed.length).toBeGreaterThanOrEqual(4);
    expect(recentFor(undefined).length).toBeGreaterThanOrEqual(3);
  });

  it('every cover is a CSS gradient string (not a URL)', () => {
    for (const item of feed) {
      expect(item.cover).toContain('gradient');
      expect(item.cover).not.toMatch(/^https?:|url\(/);
    }
  });

  it('every item has likes/comments; the overall + per-medium heroes carry hook/forThoseWho', () => {
    for (const item of feed) {
      expect(typeof item.likes).toBe('number');
      expect(typeof item.comments).toBe('number');
    }
    for (const m of [undefined, ...MEDIA]) {
      const hero = latestFor(m);
      expect(hero?.hook).toBeTruthy();
      expect(hero?.forThoseWho).toBeTruthy();
    }
  });
});

describe('HM-1 latestFor', () => {
  it('returns feed[0] when medium is undefined', () => {
    expect(latestFor(undefined)).toBe(feed[0]);
  });

  it('returns the first item matching the medium otherwise', () => {
    const livre = latestFor('livre');
    expect(livre?.medium).toBe('livre');
    expect(livre).toBe(feed.find((item) => item.medium === 'livre'));
  });
});

describe('HM-1 recentFor', () => {
  it('undefined -> feed minus the overall hero', () => {
    const recent = recentFor(undefined);
    expect(recent).toHaveLength(feed.length - 1);
    expect(recent).not.toContain(latestFor(undefined));
  });

  it('medium -> only that medium, minus that medium hero', () => {
    const recent = recentFor('film');
    const hero = latestFor('film');
    expect(recent.every((item) => item.medium === 'film')).toBe(true);
    expect(recent).not.toContain(hero);
    const allFilmsButHero = feed.filter(
      (item) => item.medium === 'film' && item !== hero,
    );
    expect(recent).toHaveLength(allFilmsButHero.length);
  });
});
