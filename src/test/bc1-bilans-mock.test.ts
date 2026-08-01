import { describe, it, expect, expectTypeOf } from 'vitest';
import type { PublishedArticle, Medium } from '../mock/types';
import {
  bilans,
  bilansByYear,
  latestBilan,
  bilanById,
  type MonthlyBilan,
} from '../mock/bilans';

describe('BC-1 Article.relatedTo', () => {
  it('adds an optional relatedTo field without changing existing fields', () => {
    const article: PublishedArticle = {
      id: 'a1',
      title: 'La lumière du Nord',
      medium: 'film',
      excerpt: 'Un drame glacé.',
      cover: 'linear-gradient(150deg,#d18a5a,#9a4d2c)',
      date: '27 juin 2026',
      author: 'Marie-Zoé',
      likes: 88,
      comments: 15,
      status: 'published',
      publishedAt: '2026-06-12',
      views: 420,
      relatedTo: { title: 'Un dernier été', note: 'Même silences.' },
    };
    expect(article.relatedTo?.title).toBe('Un dernier été');
    expectTypeOf<PublishedArticle['relatedTo']>().toEqualTypeOf<
      { title: string; note: string } | undefined
    >();
    // Still valid without relatedTo (optional, additive).
    const minimal: PublishedArticle = {
      id: 'a2',
      title: 'x',
      medium: 'livre',
      excerpt: 'y',
      cover: 'linear-gradient(0deg,#000,#111)',
      date: '1 janvier 2026',
      author: 'Marie-Zoé',
      likes: 0,
      comments: 0,
      status: 'published',
      publishedAt: '2026-06-12',
      views: 420,
    };
    expect(minimal.relatedTo).toBeUndefined();
  });
});

describe('BC-1 bilans model shape', () => {
  it('every bilan matches the MonthlyBilan contract', () => {
    for (const bilan of bilans) {
      expectTypeOf(bilan).toMatchTypeOf<MonthlyBilan>();
      expect(bilan.id).toMatch(/^\d{4}-\d{2}$/);
      expect(bilan.month).toBeGreaterThanOrEqual(1);
      expect(bilan.month).toBeLessThanOrEqual(12);
      expect(typeof bilan.monthLabel).toBe('string');
      expect(Array.isArray(bilan.avis)).toBe(true);
    }
  });
});

describe('BC-1 bilans coverage', () => {
  it('has >= 3 bilans spanning >= 2 distinct years, current year with >= 3 months', () => {
    expect(bilans.length).toBeGreaterThanOrEqual(3);
    const years = new Set(bilans.map((b) => b.year));
    expect(years.size).toBeGreaterThanOrEqual(2);
    expect(bilansByYear()[0].months.length).toBeGreaterThanOrEqual(3);
  });

  it('every avis cover contains gradient (never a URL) and all avis ids are unique', () => {
    const ids: string[] = [];
    for (const bilan of bilans) {
      for (const item of bilan.avis) {
        expect(item.cover).toContain('gradient');
        expect(item.cover).not.toMatch(/^https?:|url\(/);
        ids.push(item.id);
      }
    }
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('BC-1 selectors', () => {
  it('latestBilan() is bilans[0] with >= 2 media and a detailed item (body + relatedTo)', () => {
    const latest = latestBilan();
    expect(latest).toBe(bilans[0]);
    const media = new Set<Medium>(latest.avis.map((i) => i.medium));
    expect(media.size).toBeGreaterThanOrEqual(2);
    const detailed = latest.avis.find((i) => i.body && i.relatedTo);
    expect(detailed).toBeTruthy();
    expect(detailed!.body).toBeTruthy();
    expect(detailed!.relatedTo).toBeTruthy();
  });

  it('newest bilan is Juin 2026 (id 2026-06)', () => {
    expect(latestBilan().id).toBe('2026-06');
    expect(latestBilan().monthLabel).toBe('Juin');
    expect(latestBilan().year).toBe(2026);
  });

  it('bilanById resolves a known id, returns undefined for an unknown id', () => {
    expect(bilanById('2026-06')).toBe(
      bilans.find((b) => b.id === '2026-06'),
    );
    expect(bilanById('2099-13')).toBeUndefined();
  });

  it('bilansByYear() has strictly descending years and descending months within a year', () => {
    const grouped = bilansByYear();
    for (let i = 1; i < grouped.length; i++) {
      expect(grouped[i - 1].year).toBeGreaterThan(grouped[i].year);
    }
    for (const { months } of grouped) {
      for (let i = 1; i < months.length; i++) {
        expect(months[i - 1].month).toBeGreaterThan(months[i].month);
      }
    }
  });
});
