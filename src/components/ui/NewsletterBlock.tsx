import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ApiError } from '../../api/client';
import { subscribeNewsletter } from '../../api/mutations';
import { isPlausibleEmail } from '../../validation';
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
 * Content-only props — the component owns no editorial copy of its own, taking
 * every word as a prop. The form variants (`band`/`feature`) do submit for
 * real, through `subscribeNewsletter` in `api/mutations.ts` rather than any
 * mock: a honeypot field and a mount timestamp ride along, the same guards
 * `CommentComposer` sends, and a pending/success/error line replaces the
 * `preventDefault()`-only stub this used to be. `compact` renders no form and
 * stays untouched — it is a plain `Link`.
 */
export default function NewsletterBlock(props: NewsletterBlockProps) {
  const { variant, eyebrow, title, copy, cta, testId } = props;
  const [email, setEmail] = useState('');
  const [pending, setPending] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [error, setError] = useState<string>();

  const openedAt = useRef(Date.now());
  const trap = useRef<HTMLInputElement | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const address = email.trim();
    if (pending || !isPlausibleEmail(address)) {
      setError('Cette adresse ne ressemble pas à un e-mail.');
      return;
    }

    setPending(true);
    setError(undefined);
    try {
      await subscribeNewsletter({
        email: address,
        trap: trap.current?.value ?? '',
        openedAt: openedAt.current,
      });
      setSubscribed(true);
      setEmail('');
    } catch (cause: unknown) {
      setError(cause instanceof ApiError ? cause.message : "L’inscription n’a pas pu être envoyée.");
    } finally {
      setPending(false);
    }
  }

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
        <>
          <form className={styles.nbForm} onSubmit={submit}>
            <input
              type="email"
              className={styles.nbInput}
              placeholder={props.placeholder}
              aria-label="Adresse e-mail"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(undefined);
              }}
            />
            {/* The honeypot: off-screen, only a script fills it. */}
            <input
              ref={trap}
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              style={{ position: 'absolute', left: '-9999px', width: '1px', height: '1px' }}
            />
            <button type="submit" className={styles.nbAction} disabled={pending}>
              {pending ? 'Envoi…' : cta}
            </button>
          </form>
          {subscribed && (
            <p className={styles.nbNotice} role="status">
              Merci ! Vous êtes abonné·e.
            </p>
          )}
          {error && (
            <p className={styles.nbNotice} role="alert">
              {error}
            </p>
          )}
        </>
      )}
    </section>
  );
}
