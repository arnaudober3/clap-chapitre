import { Link } from 'react-router-dom';
import { PosterThumb, LogoMark } from '../../components/ui';
import { MEDIUM_ACCENT } from '../../media';
import type { NewsletterEdition } from '../../newsletter';
import styles from './AdminNewsletter.module.css';

/**
 * The e-mail as the subscriber will receive it (design 6e desktop → 7d mobile):
 * masthead, the month's headline and humeur, its first coups de cœur, and the
 * link back to the full bilan. Everything comes from the edition — this
 * component holds no copy of its own beyond the wrapper's boilerplate.
 *
 * The mail title is an <h2>: the page's own <h1> is "Newsletter", and this is a
 * preview nested inside it, not a second page heading.
 */
export default function EmailPreview({ edition }: { edition: NewsletterEdition }) {
  return (
    <div className={styles.mail} data-testid="newsletter-preview">
      {/* The design's chrome bar said "De : … · À : vous", which the masthead
          already covers. It carries the one thing the preview can't show
          instead: which bilan this edition was generated from. */}
      <div className={styles.mailChrome}>Aperçu — généré depuis « {edition.title} »</div>

      <div className={styles.mailBody}>
        <div className={styles.masthead}>
          <LogoMark size={30} className={styles.mastheadMark} />
          Clap <span className={styles.mastheadEt}>et</span> chapitre
        </div>
        <div className={styles.mastheadRule} aria-hidden="true" />

        <div className={styles.mailEyebrow}>{edition.eyebrow}</div>
        <h2 className={styles.mailTitle}>{edition.title}</h2>
        {edition.mood ? <p className={styles.mailMood}>{edition.mood}</p> : null}

        <div className={styles.mailDivider} aria-hidden="true" />

        {edition.highlights.map((highlight) => (
          <div key={highlight.id} className={styles.highlight}>
            <PosterThumb cover={highlight.cover} className={styles.highlightCover} />
            <div>
              <div
                className={styles.highlightLabel}
                style={{ ['--highlight-accent']: MEDIUM_ACCENT[highlight.medium]  }}
              >
                {highlight.label}
              </div>
              <div className={styles.highlightTitle}>{highlight.title}</div>
              <div className={styles.highlightHook}>{highlight.hook}</div>
            </div>
          </div>
        ))}

        <div className={styles.mailCta}>
          <p className={styles.mailCtaCopy}>
            La version complète du bilan vous attend sur le site.
          </p>
          <Link to={`/bilan-culturel?mois=${edition.id}`} className={styles.mailCtaLink}>
            Lire le bilan complet →
          </Link>
        </div>

        <p className={styles.mailFoot}>
          Vous recevez ce courrier car vous êtes abonné·e.
          <br />
          Se désabonner · Voir sur le site
        </p>
      </div>
    </div>
  );
}
