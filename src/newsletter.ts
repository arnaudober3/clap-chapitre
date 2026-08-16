/**
 * Newsletter derivation — pure, network-free. "Le courrier du mois" is not
 * written by hand: it is generated from a bilan culturel, so this module maps
 * a real `Bilan` onto the newsletter shape rather than owning any editorial
 * copy of its own.
 *
 * Relocated out of `mock/newsletter.ts`, which this replaces: the newsletter
 * is no longer a mock-only feature, so its pure helpers move next to
 * `src/format.ts` and `src/media.ts`, the other single-purpose modules at this
 * level.
 */
import type { Bilan, Medium } from '../shared/content';
import { MEDIUM_CHIP_LABEL } from './media';
import { ofMonth, shortDate } from './format';

/** One coup de cœur as the e-mail renders it. */
export interface NewsletterHighlight {
  id: string;
  medium: Medium;
  /** Eyebrow above the title, e.g. "Film · coup de cœur". */
  label: string;
  title: string;
  /** The avis' hook, or its excerpt when it has none. */
  hook: string;
  /** Cover art — an R2 object key, or '' for no image yet. */
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

/** A send slot: a sortable ISO day plus a 24h "HH:MM" time. */
export interface ScheduleSlot {
  date: string;
  time: string;
}

/**
 * How many coups de cœur the e-mail carries. The newsletter is a teaser, not
 * the bilan itself — it shows the first two and sends the reader to the site.
 */
export const HIGHLIGHTS_IN_EMAIL = 2;

/**
 * Where a test mail goes by default — "M'envoyer un test" means the editor.
 * Just a client-side default for the input; the server carries no notion of
 * "the admin's e-mail".
 */
export const EDITOR_EMAIL = 'marie-zoe@clapetchapitre.fr';

/** The hour a scheduled newsletter goes out, if the editor keeps the default. */
const DEFAULT_SEND_TIME = '09:00';

/** "Bilan — Juin 2026" — how a source reads in the picker. */
export function sourceLabel(bilan: Bilan): string {
  return `Bilan — ${bilan.monthLabel} ${bilan.year}`;
}

/** The month a given edition covers, e.g. "de juin 2026". */
export function editionLabel(bilan: Bilan): string {
  return `${ofMonth(bilan.monthLabel)} ${bilan.year}`;
}

/** Build the previewable edition from a bilan. */
export function editionFor(bilan: Bilan): NewsletterEdition {
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
 * The slot the schedule form opens on: the morning after the bilan went
 * online (for a published bilan), or today for one still in draft.
 */
export function proposedSlotFor(bilan: Bilan): ScheduleSlot {
  const base = bilan.status === 'published' ? bilan.publishedAt : new Date().toISOString().slice(0, 10);
  const [year, month, day] = base.split('-').map(Number);
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
 * A stored UTC instant ('2026-07-03 07:00:00', what `scheduled_at` holds) →
 * its Paris-local French reading. The server never stores or emits the
 * French string — this is `shortDate`'s counterpart for a full instant
 * rather than a bare day, built with the browser's own `Intl`, the same way
 * `functions/_lib/schedule.ts` uses the runtime's `Intl` server-side.
 */
export function instantLabel(utcInstant: string): string {
  const date = new Date(`${utcInstant.replace(' ', 'T')}Z`);
  const parts = new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Europe/Paris',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '';
  return `${get('day')} ${get('month')} ${get('year')} à ${get('hour')}:${get('minute')}`;
}
