import { meSuivre } from '../../mock/mesuivre';
import NewsletterFeature from './NewsletterFeature';
import SocialGrid from './SocialGrid';
import styles from './MeSuivre.module.css';

/**
 * Salon Me suivre page (design 3c): the page head (eyebrow, H1, standfirst),
 * the dark newsletter feature with its inert form, then the 2×2 grid of
 * external social links. Static mock content; the feature stacks and the grid
 * collapses to one column below the md breakpoint.
 */
export default function MeSuivrePage() {
  const { eyebrow, title, intro, newsletter, socials } = meSuivre;

  return (
    <div className={styles.page} data-testid="me-suivre-page">
      {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
      <h1 className={styles.title}>{title}</h1>
      {intro ? <p className={styles.intro}>{intro}</p> : null}

      <div className={styles.newsletterSlot}>
        <NewsletterFeature {...newsletter} />
      </div>

      <SocialGrid socials={socials} />
    </div>
  );
}
