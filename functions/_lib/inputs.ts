/**
 * Request bodies → validated payloads.
 *
 * The readers in `body.ts` are generic; these are the project's own shapes, kept
 * here rather than in each handler so a POST and a PUT cannot drift into
 * accepting slightly different things — which is exactly how a field ends up
 * saveable at creation and silently dropped on the next edit.
 *
 * Every ceiling below is a sanity bound, not an editorial rule. They exist so a
 * caller cannot hand us a megabyte of title, and they are generous enough that
 * no real avis will ever meet one.
 */
import { email, ids, int, objects, oneOf, optionalText, text, BodyError } from './body';
import { isMediaKey } from './media';
import { MEDIA } from './query';
import { slug } from './write';
import type { Medium } from '../../shared/content';

const STATUSES = ['draft', 'published'] as const;
export type Status = (typeof STATUSES)[number];

export interface ArticleInput {
  title: string;
  medium: Medium;
  excerpt: string;
  cover: string;
  status: Status;
  hook?: string;
  forThoseWho?: string;
  body?: string;
  genreMeta?: string;
  readingTime?: string;
  pullQuote?: string;
  relatedTo?: { title: string; note: string };
  related: Array<{ id: string; note: string }>;
}

/**
 * The cover, which is a media key or nothing at all.
 *
 * Validated rather than trusted: it is the only field whose value the client
 * gets to invent — everything else is typed prose. An unchecked key would let a
 * caller point an avis at an arbitrary bucket path.
 */
function coverKey(body: Record<string, unknown>): string {
  const value = body.cover;
  if (value === undefined || value === null || value === '') return '';
  if (typeof value !== 'string' || !isMediaKey(value)) throw new BodyError('cover');
  return value;
}

export function readArticleInput(body: Record<string, unknown>): ArticleInput {
  const relatedTitle = optionalText(body, 'relatedToTitle', { max: 200 });
  const relatedNote = optionalText(body, 'relatedToNote', { max: 300 });

  // The schema pairs these two — `CHECK ((related_to_title IS NULL) = (related_to_note
  // IS NULL))` — so half a callout is refused here, where the field can be named,
  // rather than by a constraint that surfaces as an opaque 503.
  if (Boolean(relatedTitle) !== Boolean(relatedNote)) throw new BodyError('relatedTo');

  return {
    title: text(body, 'title', { max: 200 }),
    medium: oneOf(body, 'medium', MEDIA),
    excerpt: text(body, 'excerpt', { max: 600 }),
    cover: coverKey(body),
    status: oneOf(body, 'status', STATUSES),
    hook: optionalText(body, 'hook', { max: 300 }),
    forThoseWho: optionalText(body, 'forThoseWho', { max: 300 }),
    body: optionalText(body, 'body', { max: 40_000 }),
    genreMeta: optionalText(body, 'genreMeta', { max: 200 }),
    readingTime: optionalText(body, 'readingTime', { max: 60 }),
    pullQuote: optionalText(body, 'pullQuote', { max: 600 }),
    relatedTo:
      relatedTitle && relatedNote ? { title: relatedTitle, note: relatedNote } : undefined,
    related: readRelated(body),
  };
}

/** The "à rapprocher de" links: at most two, each an avis id plus why. */
function readRelated(body: Record<string, unknown>): Array<{ id: string; note: string }> {
  return objects(body, 'related', { max: 2 }).map((entry) => ({
    id: text(entry, 'id', { max: 100 }),
    note: text(entry, 'note', { max: 300 }),
  }));
}

export interface BilanInput {
  id: string;
  year: number;
  month: number;
  monthLabel: string;
  title: string;
  mood?: string;
  status: Status;
  /** The month's selection, in editorial order — the order *is* the data. */
  avis: string[];
  /** Per-avis edits the bilan form makes inline, each card sent whole. */
  edits: BilanCardEdit[];
}

export interface BilanCardEdit {
  id: string;
  title: string;
  excerpt: string;
  hook?: string;
  forThoseWho?: string;
  body?: string;
  relatedTo?: { title: string; note: string };
}

/** 'AAAA-MM', the shape `bilans.id` is GLOB-constrained to. */
const MONTH_ID = /^\d{4}-(0[1-9]|1[0-2])$/;

export function readBilanInput(body: Record<string, unknown>): BilanInput {
  const id = text(body, 'id', { max: 7 });
  // The GLOB in migration 0001 would reject this too, but as a constraint error
  // reaching the caller as a 503. Naming the field is worth the duplicated rule.
  if (!MONTH_ID.test(id)) throw new BodyError('id');

  const [year, month] = id.split('-').map(Number);

  return {
    id,
    year,
    month,
    monthLabel: text(body, 'monthLabel', { max: 40 }),
    title: text(body, 'title', { max: 200 }),
    mood: optionalText(body, 'mood', { max: 2000 }),
    status: oneOf(body, 'status', STATUSES),
    avis: ids(body, 'avis', { max: 60 }),
    edits: readEdits(body),
  };
}

/**
 * The bilan form edits its cards in place — title, hook, body, "pour ceux qui"
 * and the callout all belong to the avis, not to the month. So saving a bilan
 * writes into `articles` too, and this is that half of the payload.
 *
 * Each card is sent whole, not as a diff: `title` and `excerpt` are required
 * because the write sets every card column, and an omitted one would blank the
 * avis rather than leave it alone. The optional fields are genuinely clearable —
 * that is the difference between them.
 */
function readEdits(body: Record<string, unknown>): BilanCardEdit[] {
  return objects(body, 'edits', { max: 60 }).map((entry) => {
    const relatedTitle = optionalText(entry, 'relatedToTitle', { max: 200 });
    const relatedNote = optionalText(entry, 'relatedToNote', { max: 300 });
    if (Boolean(relatedTitle) !== Boolean(relatedNote)) throw new BodyError('relatedTo');

    return {
      id: text(entry, 'id', { max: 100 }),
      title: text(entry, 'title', { max: 200 }),
      excerpt: text(entry, 'excerpt', { max: 600 }),
      hook: optionalText(entry, 'hook', { max: 300 }),
      forThoseWho: optionalText(entry, 'forThoseWho', { max: 300 }),
      body: optionalText(entry, 'body', { max: 40_000 }),
      relatedTo:
        relatedTitle && relatedNote ? { title: relatedTitle, note: relatedNote } : undefined,
    };
  });
}

export interface AproposInput {
  eyebrow: string;
  greeting: string;
  name: string;
  intro: string;
  portraitLabel: string;
  portraitImage: string;
  bio: string;
  bioEmphasis: string;
  quote: string;
  statsTitle: string;
  followTitle: string;
  followCopy: string;
  followCta: string;
  followTo: string;
  stats: Array<{ label: string; value: number }>;
}

export function readAproposInput(body: Record<string, unknown>): AproposInput {
  const portrait = body.portraitImage;
  if (
    portrait !== undefined &&
    portrait !== null &&
    portrait !== '' &&
    (typeof portrait !== 'string' || !isMediaKey(portrait))
  ) {
    throw new BodyError('portraitImage');
  }

  return {
    eyebrow: text(body, 'eyebrow', { max: 120 }),
    greeting: text(body, 'greeting', { max: 120 }),
    name: text(body, 'name', { max: 120 }),
    intro: text(body, 'intro', { max: 1000 }),
    portraitLabel: text(body, 'portraitLabel', { max: 200 }),
    portraitImage: typeof portrait === 'string' ? portrait : '',
    bio: text(body, 'bio', { max: 20_000 }),
    // Allowed to be empty: an editor emphasising nothing is a valid choice, and
    // the column's own default is ''.
    bioEmphasis: optionalText(body, 'bioEmphasis', { max: 2000 }) ?? '',
    quote: text(body, 'quote', { max: 1000 }),
    statsTitle: text(body, 'statsTitle', { max: 200 }),
    followTitle: text(body, 'followTitle', { max: 200 }),
    followCopy: text(body, 'followCopy', { max: 1000 }),
    followCta: text(body, 'followCta', { max: 120 }),
    followTo: text(body, 'followTo', { max: 200 }),
    stats: objects(body, 'stats', { max: 12 }).map((entry) => ({
      label: text(entry, 'label', { max: 120 }),
      value: int(entry, 'value', { min: 0, max: 1_000_000 }),
    })),
  };
}

export interface MeSuivreInput {
  eyebrow: string;
  title: string;
  intro: string;
  newsletterEyebrow: string;
  newsletterTitle: string;
  newsletterCopy: string;
  newsletterPlaceholder: string;
  newsletterCta: string;
  socials: Array<{
    key: string;
    name: string;
    handle: string;
    glyph: string;
    url: string;
    cta: string;
  }>;
}

export function readMeSuivreInput(body: Record<string, unknown>): MeSuivreInput {
  return {
    eyebrow: text(body, 'eyebrow', { max: 120 }),
    title: text(body, 'title', { max: 200 }),
    intro: text(body, 'intro', { max: 2000 }),
    newsletterEyebrow: text(body, 'newsletterEyebrow', { max: 120 }),
    newsletterTitle: text(body, 'newsletterTitle', { max: 200 }),
    newsletterCopy: text(body, 'newsletterCopy', { max: 1000 }),
    newsletterPlaceholder: text(body, 'newsletterPlaceholder', { max: 200 }),
    newsletterCta: text(body, 'newsletterCta', { max: 120 }),
    socials: readSocials(body),
  };
}

/**
 * The social links. `key` is the primary key and comes from the client, which
 * mints `nouveau-1` for a row it just added — so the server derives the real one
 * from the name and ignores what was sent. Two links named the same collapse
 * onto one key, which the `ids` duplicate check below turns into a named error
 * instead of a mid-batch constraint failure.
 */
function readSocials(body: Record<string, unknown>): MeSuivreInput['socials'] {
  const rows = objects(body, 'socials', { max: 20 }).map((entry) => {
    const name = text(entry, 'name', { max: 120 });
    return {
      key: slugKey(name),
      name,
      handle: text(entry, 'handle', { max: 120 }),
      // Two letters in the design ("Th", "Lb"), but not enforced here — an
      // editor writing three is making a layout choice, not an error.
      glyph: text(entry, 'glyph', { max: 4 }),
      url: text(entry, 'url', { max: 500 }),
      cta: text(entry, 'cta', { max: 120 }),
    };
  });

  const keys = rows.map((row) => row.key);
  if (new Set(keys).size !== keys.length) throw new BodyError('socials');
  return rows;
}

/**
 * A name → a stable key, through the same folding an avis id goes through.
 * Unlike an avis, there is no sensible fallback for a name that folds to
 * nothing: 'avis' would be a misleading primary key for a social link.
 */
function slugKey(name: string): string {
  const key = slug(name).slice(0, 40);
  if (!key) throw new BodyError('socials');
  return key;
}

export interface NewsletterSendInput {
  subject: string;
}

export function readNewsletterSendInput(body: Record<string, unknown>): NewsletterSendInput {
  return { subject: text(body, 'subject', { max: 200 }) };
}

export interface NewsletterTestInput extends NewsletterSendInput {
  email: string;
}

export function readNewsletterTestInput(body: Record<string, unknown>): NewsletterTestInput {
  return {
    subject: text(body, 'subject', { max: 200 }),
    email: email(body, 'email', { max: 254 }),
  };
}

export interface NewsletterScheduleInput extends NewsletterSendInput {
  date: string;
  time: string;
}

/** 'AAAA-MM-JJ', the shape an HTML `<input type="date">` sends. */
const DATE_SHAPE = /^\d{4}-\d{2}-\d{2}$/;
/** 'HH:MM', the shape an HTML `<input type="time">` sends. */
const TIME_SHAPE = /^([01]\d|2[0-3]):[0-5]\d$/;

export function readNewsletterScheduleInput(
  body: Record<string, unknown>,
): NewsletterScheduleInput {
  const date = text(body, 'date', { max: 10 });
  if (!DATE_SHAPE.test(date)) throw new BodyError('date');
  const time = text(body, 'time', { max: 5 });
  if (!TIME_SHAPE.test(time)) throw new BodyError('time');

  return { subject: text(body, 'subject', { max: 200 }), date, time };
}
