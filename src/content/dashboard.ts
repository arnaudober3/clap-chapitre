/**
 * The vocabulary of the tableau de bord, and the one figure it derives.
 *
 * The numbers themselves come from `/api/admin/dashboard`; what stays here is
 * the shapes the cards agree on and `ranked()`, which turns view counts into the
 * bar widths the palmarès draws. That ratio is presentation — it depends on the
 * widest bar on screen, not on anything the database knows.
 */
import { MEDIUM_CHIP_LABEL } from '../media';
import type { Medium } from '../../shared/content';

/** What a leaderboard row can be: one of the four media, or a bilan. */
export type LeaderboardKind = Medium | 'bilan';

export interface KpiStat {
  key: string;
  label: string;
  value: number;
  /** Change against the previous window, in percent. Negative when it dipped. */
  deltaPct: number;
}

export interface Period {
  id: string;
  label: string;
}

export interface LeaderboardEntry {
  id: string;
  kind: LeaderboardKind;
  title: string;
  views: number;
  /** Present when the row links to an avis; a bilan has no article page. */
  articleId?: string;
}

/** A leaderboard row with its bar width, 0..1 of the best-performing row. */
export interface RankedEntry extends LeaderboardEntry {
  ratio: number;
  /** The chip's French label — 'Film', 'Docs', 'Bilan'. */
  kindLabel: string;
}

export interface TrendPoint {
  /** Short French month, e.g. 'août'. */
  month: string;
  views: number;
}

export interface Draft {
  id: string;
  title: string;
  /** What the row says on the right: 'Brouillon'. */
  kindLabel: string;
}

/** 'bilan' → 'Bilan'; a medium takes the admin chip label ('doc' → 'Docs'). */
function kindLabel(kind: LeaderboardKind): string {
  return kind === 'bilan' ? 'Bilan' : MEDIUM_CHIP_LABEL[kind];
}

/**
 * Rows with their bar width. The endpoint already sorted them by views, so this
 * only measures each against the leader — an empty list has no leader, and no
 * bars to draw.
 */
export function ranked(entries: LeaderboardEntry[]): RankedEntry[] {
  const best = entries[0]?.views ?? 0;
  return entries.map((entry) => ({
    ...entry,
    kindLabel: kindLabel(entry.kind),
    ratio: best > 0 ? entry.views / best : 0,
  }));
}
