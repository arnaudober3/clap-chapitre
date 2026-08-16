/**
 * The shape of the "Me suivre" page, and the derivations its editor needs.
 *
 * One change of substance now that the links are rows rather than a literal:
 * `SocialLink.key` is a plain string. It used to be a four-value union, which
 * was honest when the list was written in TypeScript and is not any more — the
 * editor can add a network nobody thought of, and the colour lookup already
 * falls back for a key it does not know.
 */

/** One external profile, as the page shows it. */
export interface SocialLink {
  /** Stable identifier, also the key of the card's colour swatch. */
  key: string;
  name: string;
  handle: string;
  /** The two-letter mark in the card's pill. */
  glyph: string;
  url: string;
  cta: string;
}

/** The dark newsletter block at the top of the page. */
export interface NewsletterFeature {
  eyebrow: string;
  title: string;
  copy: string;
  placeholder: string;
  cta: string;
}

export interface MeSuivreContent {
  /** Uppercase --accent eyebrow: 'Me suivre'. */
  eyebrow: string;
  /** H1: 'On garde le contact'. */
  title: string;
  /** Serif --muted standfirst (max-width 56ch). */
  intro: string;
  newsletter: NewsletterFeature;
  socials: SocialLink[];
}

/**
 * What the admin editor mounts when `page_mesuivre` has never been written —
 * an empty database, not a load failure. The static labels below match the
 * ones `examples/contenu-exemple.sql` seeds, since they are not edited on
 * screen; the fields the form does edit (title, intro, links) start blank.
 */
export const BLANK_MESUIVRE_CONTENT: MeSuivreContent = {
  eyebrow: 'Me suivre',
  // Unlike `intro`, `title` has no field on the form — `mesuivrePayload` sends
  // it back unchanged — so it needs a real value or the first save 422s on a
  // field the editor never saw.
  title: 'On garde le contact',
  intro: '',
  newsletter: {
    eyebrow: 'La newsletter',
    title: 'Le courrier du mois',
    copy: 'Le bilan complet, les coups de cœur et une reco rien que pour vous.',
    placeholder: 'votre@email.fr',
    cta: 'Je m’abonne',
  },
  socials: [],
};

/** One editable row of the links list. */
export interface SocialLinkField {
  /**
   * Stable list key: the link's own key for an existing row, 'nouveau-N' for one
   * the editor added — rows are reordered and removed, so the index is not a
   * usable key.
   */
  id: string;
  name: string;
  /** URL without scheme nor 'www.', the way design 6g prints it. */
  url: string;
  /**
   * The three fields below are `NOT NULL` in `mesuivre_socials` and are all
   * rendered on the public page. The form did not edit them while nothing was
   * saved; a link created without them would now show up incomplete.
   */
  handle: string;
  glyph: string;
  cta: string;
}

/** What the editor manipulates: the standfirst plus the links list. */
export interface MeSuivreFormValues {
  intro: string;
  links: SocialLinkField[];
}

/** 'https://www.threads.net/@mariezoe' → 'threads.net/@mariezoe' (design 6g). */
function stripScheme(url: string): string {
  return url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
}

/**
 * Two-letter abbreviations the designer chose for the chips in 6g — consonant
 * pairs, not the first two letters ('Lb', not 'Le'). Keyed by lower-cased name
 * so a row renamed in the editor picks its mark up straight away.
 */
const MARKS: Record<string, string> = {
  threads: 'Th',
  letterboxd: 'Lb',
  babelio: 'Ba',
  linkedin: 'Li',
  instagram: 'Ig',
  youtube: 'Yt',
};

/** The chip abbreviation for a link name; '+' while the row is still unnamed. */
export function linkMark(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return '+';
  const known = MARKS[trimmed.toLowerCase()];
  if (known) return known;
  return trimmed.charAt(0).toUpperCase() + trimmed.charAt(1).toLowerCase();
}

/**
 * Editable values derived from the page content. Pure — calling it again resets
 * the form, which is what "Annuler" does.
 */
export function mesuivreFormValues(content: MeSuivreContent): MeSuivreFormValues {
  return {
    intro: content.intro,
    links: content.socials.map((social) => ({
      id: social.key,
      name: social.name,
      url: stripScheme(social.url),
      handle: social.handle,
      glyph: social.glyph,
      cta: social.cta,
    })),
  };
}

/**
 * Edited values → what `PUT /api/admin/pages/me-suivre` stores.
 *
 * As on "À propos", the loaded content comes along: the form owns the standfirst
 * and the links, while the eyebrow, the H1 and the newsletter block are not on
 * screen and must survive a save untouched.
 *
 * Two inverses here. `stripScheme` removed the protocol for display, so it goes
 * back on — a stored 'threads.net/@x' would be read as a relative link. And the
 * client-side `id` is dropped entirely: rows the editor added carry 'nouveau-3',
 * which is a React list key, not a primary key. The server derives the real one
 * from the name.
 */
export function mesuivrePayload(content: MeSuivreContent, values: MeSuivreFormValues) {
  return {
    eyebrow: content.eyebrow,
    title: content.title,
    intro: values.intro,
    newsletterEyebrow: content.newsletter.eyebrow,
    newsletterTitle: content.newsletter.title,
    newsletterCopy: content.newsletter.copy,
    newsletterPlaceholder: content.newsletter.placeholder,
    newsletterCta: content.newsletter.cta,
    socials: values.links
      // An unnamed row is one the editor started and left: there is no key to
      // derive from it, and the endpoint would answer 422.
      .filter((link) => link.name.trim() !== '')
      .map((link) => ({
        name: link.name.trim(),
        // Each falls back to something the page can render rather than being
        // sent empty, which `NOT NULL` refuses. The editor can correct them.
        handle: link.handle.trim() || `@${link.name.trim().toLowerCase()}`,
        glyph: link.glyph.trim() || linkMark(link.name),
        url: withScheme(link.url),
        cta: link.cta.trim() || 'Suivre',
      })),
  };
}

/** The inverse of `stripScheme`: a stored URL has to be absolute. */
function withScheme(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return '';
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}
