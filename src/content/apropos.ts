/**
 * The shape of the "À propos" page, and the derivation its editor needs.
 *
 * What used to sit here as a French constant now lives in the database; what
 * remains is the vocabulary the page and its form agree on, plus one pure
 * function turning the content into editable fields.
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

/** One editable row of the "Cette année" block in the back-office form. */
export interface YearStatField {
  label: string;
  /**
   * Kept as a string, unlike `YearStat.value`: the field has to accept being
   * emptied while the editor types, which a `number` cannot represent.
   */
  value: string;
}

/** The flat shape the admin editor manipulates (design 6f / 7e). */
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

/**
 * Editable values derived from the page content. Pure — calling it again resets
 * the form, which is exactly what "Annuler" does.
 *
 * It takes the content as an argument now that the content is fetched: the form
 * is only mounted once the page has arrived, so there is always something to
 * derive from.
 */
export function aproposFormValues(content: AProposContent): AProposFormValues {
  return {
    title: `${content.greeting} ${content.name}`,
    intro: content.intro,
    bio: content.bio.join('\n\n'),
    quote: unquote(content.quote),
    stats: content.stats.map((stat) => ({ label: stat.label, value: String(stat.value) })),
  };
}
