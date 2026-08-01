/**
 * Admin newsletter mock content (designs 6e / 7d). "Le courrier du mois" is not
 * written by hand: it is *generated* from a bilan culturel — the month's title,
 * its humeur and its first coups de cœur become the e-mail. So this module owns
 * no editorial copy of its own; it only maps the bilan catalogue onto the
 * newsletter shape, and adds the audience figures the design shows.
 *
 * Static, deterministic, network-free. Selectors are pure functions (no React,
 * no module-level mutable state), mirroring dashboard.ts / adminBilans.ts.
 */
import type { Medium, PublishedBilan } from './types';
import { bilans } from './bilans';
import { MEDIUM_CHIP_LABEL } from '../media';
import { ofMonth, shortDate } from '../format';

/** One coup de cœur as the e-mail renders it. */
export interface NewsletterHighlight {
  id: string;
  medium: Medium;
  /** Eyebrow above the title, e.g. "Film · coup de cœur". */
  label: string;
  title: string;
  /** The avis' hook, or its excerpt when it has none. */
  hook: string;
  /** Cover art — a CSS gradient string, never a URL. */
  cover: string;
}

/** A whole edition, ready to preview. Derived from one bilan. */
export interface NewsletterEdition {
  /** The source bilan's 'YYYY-MM' id. */
  id: string;
  monthLabel: string;
  year: number;
  /** "Le courrier du mois · Juin 2026". */
  eyebrow: string;
  title: string;
  mood: string;
  /** The pre-filled mail subject. */
  subject: string;
  highlights: NewsletterHighlight[];
}

/** A past send, as the "Derniers envois" list shows it. */
export interface SendRecord {
  id: string;
  title: string;
  /** Short French send date, e.g. "3 juin". */
  dateLabel: string;
  /** Open rate in percent (0–100). Absent on an edition just sent. */
  openRatePct?: number;
}

/** A send slot: a sortable ISO day plus a 24h "HH:MM" time. */
export interface ScheduleSlot {
  date: string;
  time: string;
}

/** The audience figures of the "Abonnés" card. */
export interface SubscriberStats {
  total: number;
  /** Net subscribers gained this month — negative when unsubscribes win. */
  monthDelta: number;
  /**
   * Mean open rate across every edition ever mailed, in percent (0–100) — not
   * just the ones the "Derniers envois" list shows, which carry their own rate.
   */
  openRatePct: number;
}

/**
 * How many coups de cœur the e-mail carries. The newsletter is a teaser, not
 * the bilan itself — it shows the first two and sends the reader to the site.
 */
export const HIGHLIGHTS_IN_EMAIL = 2;

/**
 * Where a test mail goes by default — "M’envoyer un test" means the editor, and
 * this prototype has exactly one (Marie-Zoé). Kept editable in the form all the
 * same: sending a proof to someone else is the other half of what it is for.
 */
export const EDITOR_EMAIL = 'marie-zoe@clapetchapitre.fr';

/** The hour a scheduled newsletter goes out, if the editor keeps the default. */
const DEFAULT_SEND_TIME = '09:00';

const STATS: SubscriberStats = {
  total: 1284,
  monthDelta: 38,
  openRatePct: 61,
};

/** Send date + open rate per already-mailed edition, keyed by bilan id. */
const SENT: Array<{ id: string; dateLabel: string; openRatePct: number }> = [
  { id: '2026-05', dateLabel: '3 juin', openRatePct: 59 },
  { id: '2026-04', dateLabel: '5 mai', openRatePct: 57 },
];

/** The audience figures. */
export function subscriberStats(): SubscriberStats {
  return STATS;
}

/**
 * The bilans an edition can be generated from, newest-first. A month only
 * qualifies once it carries its coups de cœur: the archive months of
 * adminBilans.ts keep their headline but no `avis`, and would make an empty
 * e-mail.
 */
export function newsletterSources(): PublishedBilan[] {
  return bilans
    .filter((bilan) => bilan.avis.length > 0)
    .sort((a, b) => b.publishedAt.localeCompare(a.publishedAt));
}

/** The month the page opens on — the most recent bilan that can be mailed. */
export function defaultNewsletterSource(): PublishedBilan {
  return newsletterSources()[0];
}

/** Resolve a source by its 'YYYY-MM' id, falling back to the default month. */
export function newsletterSourceById(id: string): PublishedBilan {
  return newsletterSources().find((bilan) => bilan.id === id) ?? defaultNewsletterSource();
}

/** "Bilan — Juin 2026" — how a source reads in the picker. */
export function sourceLabel(bilan: PublishedBilan): string {
  return `Bilan — ${bilan.monthLabel} ${bilan.year}`;
}

/** The month a given edition covers, e.g. "de juin 2026". */
export function editionLabel(bilan: PublishedBilan): string {
  return `${ofMonth(bilan.monthLabel)} ${bilan.year}`;
}

/** Build the previewable edition from a bilan. */
export function editionFor(bilan: PublishedBilan): NewsletterEdition {
  return {
    id: bilan.id,
    monthLabel: bilan.monthLabel,
    year: bilan.year,
    eyebrow: `Le courrier du mois · ${bilan.monthLabel} ${bilan.year}`,
    title: bilan.title,
    mood: bilan.mood ?? '',
    subject: `Clap et chapitre — ${bilan.title}`,
    highlights: bilan.avis.slice(0, HIGHLIGHTS_IN_EMAIL).map((avis) => ({
      id: avis.id,
      medium: avis.medium,
      label: `${MEDIUM_CHIP_LABEL[avis.medium]} · coup de cœur`,
      title: avis.title,
      hook: avis.hook ?? avis.excerpt,
      cover: avis.cover,
    })),
  };
}

/**
 * The slot the schedule form opens on: the morning after the bilan went online.
 * Derived from the catalogue rather than from the clock, so the prototype stays
 * deterministic — a bilan always proposes the same slot.
 */
export function proposedSlotFor(bilan: PublishedBilan): ScheduleSlot {
  const [year, month, day] = bilan.publishedAt.split('-').map(Number);
  const next = new Date(year, month - 1, day + 1);
  const iso = [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, '0'),
    String(next.getDate()).padStart(2, '0'),
  ].join('-');
  return { date: iso, time: DEFAULT_SEND_TIME };
}

/** "3 juil. 2026 à 09:00" — how a slot reads once confirmed. */
export function slotLabel(slot: ScheduleSlot): string {
  return `${shortDate(slot.date)} à ${slot.time}`;
}

/**
 * Mock-grade address check: something before an @, something after, and a dot
 * in the domain. No backend validates it, so the form only has to catch the
 * obvious typo rather than police RFC 5322.
 */
export function isPlausibleEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

/**
 * The editions already mailed, newest-first. Their titles follow the bilan
 * catalogue rather than being spelled out here, so renaming a month renames its
 * send too.
 */
export function recentSends(): SendRecord[] {
  return SENT.flatMap(({ id, dateLabel, openRatePct }) => {
    const bilan = bilans.find((item) => item.id === id);
    return bilan
      ? [{ id, title: `Bilan ${ofMonth(bilan.monthLabel)}`, dateLabel, openRatePct }]
      : [];
  });
}
