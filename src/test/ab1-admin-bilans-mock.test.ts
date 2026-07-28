import { describe, it, expect } from 'vitest';
import {
  adminBilans,
  adminBilanById,
  adminBilanCounts,
  currentDraftBilan,
  bilanSortOptions,
  filterAdminBilans,
  DEFAULT_QUERY,
  PAGE_SIZE,
} from '../mock/adminBilans';
import { bilans } from '../mock/bilans';
import type { Medium } from '../mock/types';

const catalogue = adminBilans();

describe('AB-1 admin bilan catalogue', () => {
  it('holds every published month plus the one in progress', () => {
    // The design headline is "14 bilans publiés · 1 en cours".
    expect(catalogue).toHaveLength(14);
    expect(currentDraftBilan()?.status).toBe('draft');
    expect(catalogue.every((bilan) => bilan.status === 'published')).toBe(true);
  });

  it('exposes the public bilans under the same ids, without duplicating them', () => {
    const ids = catalogue.map((bilan) => bilan.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const publicBilan of bilans) {
      expect(ids).toContain(publicBilan.id);
    }
    // The draft is never part of the published catalogue.
    expect(ids).not.toContain(currentDraftBilan()!.id);
  });

  it('gives every bilan a YYYY-MM id matching its year and month', () => {
    for (const bilan of [...catalogue, currentDraftBilan()!]) {
      expect(bilan.id).toMatch(/^\d{4}-\d{2}$/);
      const [year, month] = bilan.id.split('-').map(Number);
      expect(year).toBe(bilan.year);
      expect(month).toBe(bilan.month);
    }
  });

  it('keeps the per-medium tally in step with the detailed avis when there are any', () => {
    for (const bilan of catalogue) {
      if (bilan.avis.length === 0) continue;
      const fromAvis: Partial<Record<Medium, number>> = {};
      for (const item of bilan.avis) {
        fromAvis[item.medium] = (fromAvis[item.medium] ?? 0) + 1;
      }
      expect(bilan.counts, `${bilan.id} counts`).toEqual(fromAvis);
    }
  });

  it('reports the totals the page headers show', () => {
    const counts = adminBilanCounts();
    expect(counts.published).toBe(catalogue.length);
    expect(counts.drafts).toBe(1);
    // The oldest published month is the site's very first bilan.
    expect(counts.sinceLabel).toBe('mai 2025');
  });

  it('resolves a bilan by id, draft included, and nothing for an unknown one', () => {
    expect(adminBilanById(catalogue[0].id)).toBe(catalogue[0]);
    expect(adminBilanById(currentDraftBilan()!.id)).toBe(currentDraftBilan());
    expect(adminBilanById('2099-13')).toBeUndefined();
    expect(adminBilanById('')).toBeUndefined();
  });
});

describe('AB-1 filterAdminBilans', () => {
  it('returns the whole catalogue newest-first by default', () => {
    const result = filterAdminBilans(DEFAULT_QUERY);
    expect(result).toHaveLength(catalogue.length);
    const dates = result.map((bilan) => bilan.publishedAt);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
    // The catalogue is longer than a page, so the pager has something to do.
    expect(result.length).toBeGreaterThan(PAGE_SIZE);
  });

  it('sorts oldest-first and by audience', () => {
    const oldest = filterAdminBilans({ ...DEFAULT_QUERY, sort: 'oldest' });
    expect(oldest[0].publishedAt).toBe('2025-06-02');

    const views = filterAdminBilans({ ...DEFAULT_QUERY, sort: 'views' });
    const figures = views.map((bilan) => bilan.views);
    expect([...figures].sort((a, b) => b - a)).toEqual(figures);
  });

  it('searches titles ignoring case and diacritics', () => {
    const result = filterAdminBilans({ ...DEFAULT_QUERY, search: 'FEVRIER' });
    expect(result.map((bilan) => bilan.id)).toEqual(['2026-02']);
    expect(filterAdminBilans({ ...DEFAULT_QUERY, search: '  zzz  ' })).toEqual([]);
  });

  it('offers the three sort orders', () => {
    expect(bilanSortOptions().map((option) => option.id)).toEqual([
      'recent',
      'oldest',
      'views',
    ]);
  });
});
