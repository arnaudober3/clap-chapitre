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
  /** Alt text for the portrait — a real caption now that there is a real image. */
  portraitLabel: string;
  /** R2 key of the portrait, or '' while none has been uploaded. */
  portraitImage: string;
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

/**
 * The way back: edited values → what `PUT /api/admin/pages/apropos` stores.
 *
 * It takes the loaded content as well, and has to: the form edits five things,
 * the row has fourteen columns. The eyebrow, the emphasis terms and the follow
 * card are not on screen, so they are carried through unchanged rather than
 * being blanked by a save.
 *
 * The three derivations are each the exact inverse of one above — split the
 * title back into greeting and name, the bio back into paragraphs, and put the
 * guillemets back on the quote.
 */
export function aproposPayload(
  content: AProposContent,
  values: AProposFormValues,
  portraitImage: string = content.portraitImage,
) {
  return {
    eyebrow: content.eyebrow,
    ...splitTitle(content, values.title),
    intro: values.intro,
    portraitLabel: content.portraitLabel,
    portraitImage,
    bio: values.bio.trim(),
    bioEmphasis: content.bioEmphasis.join('\n'),
    quote: requote(values.quote),
    statsTitle: content.statsTitle,
    followTitle: content.follow.title,
    followCopy: content.follow.copy,
    followCta: content.follow.cta,
    followTo: content.follow.to,
    stats: values.stats
      // A row emptied by the editor is a removal, not a stat named nothing —
      // and `label` is NOT NULL, so sending it would be refused as a 422.
      .filter((stat) => stat.label.trim() !== '')
      .map((stat) => ({ label: stat.label.trim(), value: Number(stat.value) || 0 })),
  };
}

/**
 * 'Bonjour, moi c’est Marie-Zoé' → greeting + name.
 *
 * The greeting is preserved whenever the editor left it alone, which is the
 * common case — the two are one field on screen precisely because only the name
 * ever changes. Otherwise the last word becomes the name: it is what the H1
 * italicises, and a wrong guess is visible and fixable, where dropping the split
 * would silently lose the styling.
 */
function splitTitle(content: AProposContent, title: string): { greeting: string; name: string } {
  const trimmed = title.trim();
  const prefix = `${content.greeting} `;
  if (trimmed.startsWith(prefix)) {
    return { greeting: content.greeting, name: trimmed.slice(prefix.length).trim() };
  }

  const cut = trimmed.lastIndexOf(' ');
  if (cut === -1) return { greeting: content.greeting, name: trimmed };
  return { greeting: trimmed.slice(0, cut), name: trimmed.slice(cut + 1) };
}

/** The inverse of `unquote` — the stored form carries its guillemets. */
function requote(quote: string): string {
  const trimmed = quote.trim();
  if (!trimmed) return '';
  return trimmed.startsWith('«') ? trimmed : `« ${trimmed} »`;
}
