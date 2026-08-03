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
    })),
  };
}
