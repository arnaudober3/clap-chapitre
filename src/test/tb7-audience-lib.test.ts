import { describe, it, expect } from 'vitest';
import {
  deltaPct,
  isCrawler,
  isPeriod,
  lastMonths,
  monthAbbrev,
  WINDOWS,
} from '../../functions/_lib/audience';

describe('TB-7 isCrawler', () => {
  it('catches the common crawler conventions, case-insensitively', () => {
    for (const ua of [
      'Googlebot/2.1 (+http://www.google.com/bot.html)',
      'Mozilla/5.0 (compatible; bingbot/2.0)',
      'Mozilla/5.0 (compatible; SEMRUSHBOT/7~bl)',
      'python-requests/2.31 SomeSpider',
      'facebookexternalhit/1.1',
    ]) {
      expect(isCrawler(ua)).toBe(true);
    }
  });

  it('lets an ordinary browser and a missing header through', () => {
    expect(
      isCrawler(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15',
      ),
    ).toBe(false);
    expect(isCrawler(null)).toBe(false);
  });
});

describe('TB-7 deltaPct', () => {
  it('rounds the ordinary case', () => {
    expect(deltaPct(18, 6)).toBe(200);
    expect(deltaPct(9, 3)).toBe(200);
    expect(deltaPct(4, 2)).toBe(100);
  });

  it('reports a dip as negative', () => {
    expect(deltaPct(3, 6)).toBe(-50);
  });

  it('treats an empty previous window as +100% for any activity, 0% for none', () => {
    expect(deltaPct(5, 0)).toBe(100);
    expect(deltaPct(0, 0)).toBe(0);
  });
});

describe('TB-7 isPeriod / WINDOWS', () => {
  it('recognises the three known periods and their day counts', () => {
    expect(isPeriod('7j')).toBe(true);
    expect(isPeriod('30j')).toBe(true);
    expect(isPeriod('12m')).toBe(true);
    expect(WINDOWS['7j']).toBe(7);
    expect(WINDOWS['30j']).toBe(30);
    expect(WINDOWS['12m']).toBe(365);
  });

  it('refuses a stale bookmark or invented period', () => {
    expect(isPeriod('1789')).toBe(false);
    expect(isPeriod('')).toBe(false);
  });
});

describe('TB-7 monthAbbrev / lastMonths', () => {
  it('maps a year-month to the site’s established short French form', () => {
    expect(monthAbbrev('2026-01')).toBe('jan');
    expect(monthAbbrev('2026-08')).toBe('août');
    expect(monthAbbrev('2026-12')).toBe('déc');
  });

  it('walks a continuous run of calendar months ending on the current one', () => {
    const months = lastMonths(12, new Date(Date.UTC(2026, 7, 12))); // 2026-08-12
    expect(months).toEqual([
      '2025-09',
      '2025-10',
      '2025-11',
      '2025-12',
      '2026-01',
      '2026-02',
      '2026-03',
      '2026-04',
      '2026-05',
      '2026-06',
      '2026-07',
      '2026-08',
    ]);
  });
});
