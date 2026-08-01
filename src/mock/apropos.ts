/**
 * Static content for the À propos page (design 3b). Pure data: no React, no
 * network, no mutable module state, no Date/random — the page renders the same
 * thing on every run. Copy is French, author Marie-Zoé, lifted from design 3b
 * (desktop is the source of truth; the phone frame is the same text truncated).
 */

/** One row of the "Cette année" panel. */
export interface YearStat {
  /** Row label, e.g. 'Films & séries'. */
  label: string;
  /** The number shown in serif --accent, e.g. 63. */
  value: number;
}

export interface AProposContent {
  /** Uppercase --accent eyebrow: 'À propos'. */
  eyebrow: string;
  /** H1, split so the name can be italic --accent. */
  greeting: string;
  name: string;
  /** Serif --muted standfirst under the H1. */
  intro: string;
  /** Caption for the portrait placeholder (no image file). */
  portraitLabel: string;
  /** Bio paragraphs, in order. */
  bio: string[];
  /** Substrings inside `bio` rendered semi-bold. */
  bioEmphasis: string[];
  /** The gold-rule pull-quote (guillemets included). */
  quote: string;
  /** 'Cette année' panel heading. */
  statsTitle: string;
  stats: YearStat[];
  /** Dark follow CTA card. */
  follow: { title: string; copy: string; cta: string; to: string };
}

/** The page's static content. */
export const apropos: AProposContent = {
  eyebrow: 'À propos',
  greeting: 'Bonjour, moi c’est',
  name: 'Marie-Zoé',
  intro:
    'Je regarde, je lis, et j’ai toujours un avis. Ici je le partage — honnêtement, et pour vous aider à trouver la prochaine histoire qui vous marquera.',
  portraitLabel: 'portrait',
  bio: [
    'J’ai grandi entre une pile de romans qui menaçait de s’effondrer et une télécommande que personne ne me disputait. Depuis, rien n’a changé — sauf que je note tout, désormais. Clap et chapitre, c’est mon carnet : ce que j’ai vu, ce que j’ai lu, ce que ça m’a fait.',
    'Je ne mets pas de notes. Un chiffre ne dira jamais si un film est pour vous ce soir-là. Je préfère vous dire pour qui c’est, pourquoi ça vaut le détour, et à quoi ça m’a fait penser. À vous de voir si on se ressemble.',
    'Chaque fin de mois, je rassemble tout dans un bilan : les coups de cœur, les déceptions, ce qui m’a tenue éveillée trop tard. Et si vous n’êtes pas d’accord, les commentaires sont là pour ça.',
  ],
  bioEmphasis: ['Clap et chapitre', 'bilan'],
  quote:
    '« Une bonne histoire, c’est celle qu’on a envie de raconter à quelqu’un dès qu’elle est finie. »',
  statsTitle: 'Cette année',
  stats: [
    { label: 'Films & séries', value: 63 },
    { label: 'Livres', value: 28 },
    { label: 'Bilans publiés', value: 6 },
  ],
  follow: {
    title: 'On se suit ?',
    copy: 'Le bilan du mois directement dans votre boîte mail.',
    cta: 'Me suivre →',
    to: '/me-suivre',
  },
};

export default apropos;

/** One editable row of the "Cette année" block in the back-office form. */
export interface YearStatField {
  label: string;
  /**
   * Kept as a string, unlike `YearStat.value`: the field has to accept being
   * emptied while the editor types, which a `number` cannot represent.
   */
  value: string;
}

/**
 * The flat shape the admin editor manipulates (design 6f / 7e). The page reads
 * its initial state from here rather than restating any copy: the mock above
 * stays the single source of truth.
 */
export interface AProposFormValues {
  /** Greeting and name are one field in the form: 'Bonjour, moi c’est Marie-Zoé'. */
  title: string;
  intro: string;
  /** The bio paragraphs as one editable text, blank line between them. */
  bio: string;
  /** The pull-quote without its guillemets — the public page adds them back. */
  quote: string;
  stats: YearStatField[];
}

/** Strip the display guillemets so the editor shows the sentence alone. */
function unquote(quote: string): string {
  return quote.replace(/^«\s*/, '').replace(/\s*»$/, '');
}

/** Fresh editable values, straight from the page content. Pure — call it again
 *  to reset the form (that is exactly what "Annuler" does). */
export function aproposFormValues(): AProposFormValues {
  return {
    title: `${apropos.greeting} ${apropos.name}`,
    intro: apropos.intro,
    bio: apropos.bio.join('\n\n'),
    quote: unquote(apropos.quote),
    stats: apropos.stats.map((stat) => ({ label: stat.label, value: String(stat.value) })),
  };
}
