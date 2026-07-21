/**
 * Static content for the Me suivre page (design 3c). Pure data: no React, no
 * network, no mutable module state, no Date/random — the page renders the same
 * thing on every run. Copy is French, author Marie-Zoé, lifted from design 3c
 * (desktop is the source of truth; the phone frame is the same text shortened
 * and drives layout only, not a second string set).
 */

/** The four social platforms of design 3c, in display order. */
export type SocialKey = 'threads' | 'letterboxd' | 'babelio' | 'linkedin';

/** One card of the socials grid. */
export interface SocialLink {
  key: SocialKey;
  /** Card title, e.g. 'Letterboxd'. */
  name: string;
  /** Handle + one-liner shown under the name, e.g. '@mariezoe · tous mes films'. */
  handle: string;
  /** The single glyph shown in the rounded swatch: '@' | '▶' | 'B' | 'in'. */
  glyph: string;
  /** Absolute external profile URL (opens in a new tab). */
  url: string;
  /** Right-hand call to action label, e.g. 'Suivre'. */
  cta: string;
}

export interface NewsletterFeature {
  /** Gold uppercase eyebrow: 'La newsletter'. */
  eyebrow: string;
  /** Serif cream title: 'Le courrier du mois'. */
  title: string;
  /** Muted cream copy under the title. */
  copy: string;
  /** Email input placeholder: 'votre@email.fr'. */
  placeholder: string;
  /** Submit button label: 'S’abonner'. */
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

/** The page's static content. */
export const meSuivre: MeSuivreContent = {
  eyebrow: 'Me suivre',
  title: 'On garde le contact',
  intro:
    'Choisissez votre endroit préféré — je poste au fil de l’eau sur les réseaux, et je résume tout une fois par mois dans la newsletter.',
  newsletter: {
    eyebrow: 'La newsletter',
    title: 'Le courrier du mois',
    copy: 'Le bilan complet, les coups de cœur et une reco rien que pour vous. Une fois par mois, jamais plus.',
    placeholder: 'votre@email.fr',
    cta: 'S’abonner',
  },
  // Profile URLs are plausible placeholders until the owner supplies the real
  // ones (open question 1); they are always absolute https: URLs, never '#'.
  socials: [
    {
      key: 'threads',
      name: 'Threads',
      handle: '@mariezoe · réactions à chaud',
      glyph: '@',
      url: 'https://www.threads.net/@mariezoe',
      cta: 'Suivre',
    },
    {
      key: 'letterboxd',
      name: 'Letterboxd',
      handle: '@mariezoe · tous mes films',
      glyph: '▶',
      url: 'https://letterboxd.com/mariezoe/',
      cta: 'Suivre',
    },
    {
      key: 'babelio',
      name: 'Babelio',
      handle: '@mariezoe · ma bibliothèque',
      glyph: 'B',
      url: 'https://www.babelio.com/monprofil.php',
      cta: 'Suivre',
    },
    {
      key: 'linkedin',
      name: 'LinkedIn',
      handle: 'Marie-Zoé · le côté pro',
      glyph: 'in',
      url: 'https://www.linkedin.com/in/mariezoe/',
      cta: 'Suivre',
    },
  ],
};

export default meSuivre;
