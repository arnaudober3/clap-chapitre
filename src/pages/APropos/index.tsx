import type { ReactNode } from 'react';
import { apropos } from '../../mock/apropos';
import Hero from './Hero';
import YearStats from './YearStats';
import FollowCard from './FollowCard';
import styles from './APropos.module.css';

/** True when `ch` is a letter or digit — i.e. the inside of a word. */
function isWordChar(ch: string | undefined): boolean {
  return ch !== undefined && /[\p{L}\p{N}]/u.test(ch);
}

/**
 * Splits `text` into React children, wrapping each occurrence of a term from
 * `terms` in a semi-bold <b>. Escaped-safe by construction: text is rendered as
 * children, never via dangerouslySetInnerHTML. A term absent from the text
 * leaves it unchanged (no empty <b>), and nothing is dropped or duplicated.
 *
 * Matches on whole words only: a term is emphasised solely when it is not
 * flanked by letters or digits, so 'bilan' bolds "un bilan :" but leaves
 * "les bilans" alone rather than emitting "<b>bilan</b>s".
 */
export function emphasize(text: string, terms: string[]): ReactNode[] {
  // Longest first so overlapping terms match the most specific one.
  const needles = terms.filter(Boolean).sort((a, b) => b.length - a.length);
  const out: ReactNode[] = [];
  let buffer = '';
  let index = 0;
  let key = 0;

  while (index < text.length) {
    const hit = needles.find(
      (needle) =>
        text.startsWith(needle, index) &&
        !isWordChar(text[index - 1]) &&
        !isWordChar(text[index + needle.length]),
    );
    if (hit) {
      if (buffer) {
        out.push(buffer);
        buffer = '';
      }
      out.push(
        <b key={`em-${key++}`} className={styles.bioStrong}>
          {hit}
        </b>,
      );
      index += hit.length;
    } else {
      buffer += text[index];
      index += 1;
    }
  }
  if (buffer) out.push(buffer);
  return out;
}

/**
 * Salon À propos page (design 3b): the portrait hero band, then a two-column
 * body — bio prose + gold-rule pull-quote on the left, the "Cette année" stats
 * panel and the "On se suit ?" follow CTA in the aside. Static mock content;
 * the columns collapse to one below the md breakpoint.
 */
export default function AProposPage() {
  const {
    eyebrow,
    greeting,
    name,
    intro,
    portraitLabel,
    bio,
    bioEmphasis,
    quote,
    statsTitle,
    stats,
    follow,
  } = apropos;

  return (
    <div className={styles.page} data-testid="a-propos-page">
      <Hero
        eyebrow={eyebrow}
        greeting={greeting}
        name={name}
        intro={intro}
        portraitLabel={portraitLabel}
      />

      <div className={styles.body}>
        <div className={styles.mainColumn}>
          {bio.map((paragraph, index) => (
            <p key={index} className={styles.bioParagraph} data-testid="bio-paragraph">
              {emphasize(paragraph, bioEmphasis)}
            </p>
          ))}
          {quote ? (
            <blockquote className={styles.quote} data-testid="a-propos-quote">
              <p className={styles.quoteText}>{quote}</p>
            </blockquote>
          ) : null}
        </div>

        <aside className={styles.aside}>
          <YearStats title={statsTitle} stats={stats} />
          <FollowCard
            title={follow.title}
            copy={follow.copy}
            cta={follow.cta}
            to={follow.to}
          />
        </aside>
      </div>
    </div>
  );
}
