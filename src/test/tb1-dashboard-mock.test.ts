import { describe, it, expect } from 'vitest';
import {
  kpis,
  periods,
  DEFAULT_PERIOD,
  leaderboardRanked,
  trend,
  trendPeak,
  drafts,
  newsletter,
} from '../mock/dashboard';

describe('TB-1 dashboard mock', () => {
  it('exposes the four headline KPIs with the design values', () => {
    const stats = kpis();
    expect(stats).toHaveLength(4);
    expect(stats.map((s) => s.label)).toEqual(['Vues', 'Likes', 'Commentaires', 'Partages']);
    expect(stats.map((s) => s.value)).toEqual([8940, 314, 46, 105]);
    // Every delta is positive (all "↑" in the design).
    expect(stats.every((s) => s.deltaPct > 0)).toBe(true);
  });

  it('varies the KPIs per selectable period, defaulting to the design window', () => {
    // Default (no arg) and the explicit default period return the design figures.
    expect(kpis()).toEqual(kpis(DEFAULT_PERIOD));
    expect(kpis()[0].value).toBe(8940);
    // Each period is distinct and an unknown id falls back to the default.
    expect(periods().map((p) => p.id)).toContain(DEFAULT_PERIOD);
    expect(kpis('7j')[0].value).toBe(2180);
    expect(kpis('12m')[0].value).toBe(76400);
    expect(kpis('inconnu')).toEqual(kpis(DEFAULT_PERIOD));
  });

  it('ranks the leaderboard by views desc with ratios relative to the top', () => {
    const ranked = leaderboardRanked();
    expect(ranked).toHaveLength(5);
    // Sorted strictly descending by views.
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i].views).toBeLessThan(ranked[i - 1].views);
    }
    // Top entry fills the bar; ratios decrease monotonically and stay in 0..1.
    expect(ranked[0].ratio).toBe(1);
    for (let i = 1; i < ranked.length; i += 1) {
      expect(ranked[i].ratio).toBeLessThan(ranked[i - 1].ratio);
      expect(ranked[i].ratio).toBeGreaterThan(0);
    }
    expect(ranked[0].title).toBe('Le bilan de l’été');
  });

  it('peaks in août over 12 trend points', () => {
    expect(trend()).toHaveLength(12);
    expect(trendPeak().month).toBe('août');
    expect(trendPeak().views).toBe(Math.max(...trend().map((p) => p.views)));
  });

  it('lists two drafts and the newsletter status', () => {
    expect(drafts()).toHaveLength(2);
    expect(drafts().map((d) => d.title)).toEqual(['Bilan de septembre', 'Fragments']);
    expect(newsletter().subscribers).toBe(1284);
    expect(newsletter().ready).toBe(true);
  });
});
