import { useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './ui.module.css';

/**
 * The three layouts the Salon dark card is used in:
 * - 'band'    — Home (1a): centred, max-width 520px, inline input + button.
 * - 'feature' — Me suivre (3c): two columns, copy left, stacked form right.
 * - 'compact' — À propos (3b) aside: no form, a gold pill react-router Link.
 */
export type NewsletterBlockVariant = 'band' | 'feature' | 'compact';

interface CommonProps {
  /** Optional gold uppercase eyebrow above the title. */
  eyebrow?: string;
  title: string;
  copy: string;
  /** Submit button label ('band' / 'feature') or link label ('compact'). */
  cta: string;
  /** Optional test id for the card element. */
  testId?: string;
}

/** The form variants ('band' / 'feature') take a placeholder, never a `to`. */
type FormProps = CommonProps & {
  variant: 'band' | 'feature';
  placeholder: string;
  to?: never;
};

/** The 'compact' variant takes a route to link to, and renders no form. */
type CompactProps = CommonProps & {
  variant: 'compact';
  to: string;
  placeholder?: never;
};

export type NewsletterBlockProps = FormProps | CompactProps;

const CARD_CLASS: Record<NewsletterBlockVariant, string> = {
  band: styles.nbBand,
  feature: styles.nbFeature,
  compact: styles.nbCompact,
};

/**
 * The Salon --dark-grad card, shared by Home, Me suivre and À propos: gold
 * eyebrow, serif cream title, muted cream copy and a gold pill action.
 *
 * Content-only props — the component owns no mock data and imports nothing from
 * src/mock. The form variants are inert: onSubmit prevents default, so
 * submitting never navigates, reloads or fires a request, and there is no
 * validation, success or error state.
 */
export default function NewsletterBlock(props: NewsletterBlockProps) {
  const { variant, eyebrow, title, copy, cta, testId } = props;
  const [email, setEmail] = useState('');

  return (
    <section
      className={`${styles.nbCard} ${CARD_CLASS[variant]}`}
      data-testid={testId}
    >
      <div className={styles.nbCopyBlock}>
        {eyebrow ? <p className={styles.nbEyebrow}>{eyebrow}</p> : null}
        {title ? <h2 className={styles.nbTitle}>{title}</h2> : null}
        {copy ? <p className={styles.nbCopy}>{copy}</p> : null}
      </div>

      {props.variant === 'compact' ? (
        <Link to={props.to} className={styles.nbAction}>
          {cta}
        </Link>
      ) : (
        <form
          className={styles.nbForm}
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            type="email"
            className={styles.nbInput}
            placeholder={props.placeholder}
            aria-label="Adresse e-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" className={styles.nbAction}>
            {cta}
          </button>
        </form>
      )}
    </section>
  );
}
