import { useMeSuivre } from '../../api/content';
import { PageError, PageLoading } from '../../components/ui';
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
  const { data, status, reload } = useMeSuivre();

  if (status === 'loading' || status === 'idle') {
    return (
      <div className={styles.page} data-testid="me-suivre-page">
        <PageLoading />
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.page} data-testid="me-suivre-page">
        <PageError onRetry={reload} />
      </div>
    );
  }

  const { eyebrow, title, intro, newsletter, socials } = data;

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
