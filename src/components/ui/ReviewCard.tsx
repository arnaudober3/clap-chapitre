import { Link } from 'react-router-dom';
import type { Article } from '../../../shared/content';
import { MEDIUM_ACCENT, MEDIUM_LABEL } from '../../media';
import styles from './ReviewCard.module.css';

/**
 * Shared Salon review card for a single avis: a gradient cover with the title
 * overlaid, a colored medium label, the serif title, a one-line excerpt and the
 * like/comment meta. Links to the avis (`/article/:id`). Self-contained and
 * responsive (horizontal on mobile, cover-on-top at the lg breakpoint) so both
 * the Home feed and the /avis archive render an identical card. Page-agnostic:
 * takes only an Article + optional className/testid.
 */
export default function ReviewCard({
  item,
  className,
  'data-testid': testId,
}: {
  item: Article;
  className?: string;
  'data-testid'?: string;
}) {
  return (
    <Link
      to={`/article/${item.id}`}
      className={className ? `${styles.card} ${className}` : styles.card}
      data-testid={testId ?? 'review-card'}
    >
      <div className={styles.cardCover} style={{ background: item.cover }}>
        <span className={styles.cardCoverTitle}>{item.title}</span>
      </div>
      <div className={styles.cardBody}>
        <span
          className={styles.cardMedium}
          style={{ color: MEDIUM_ACCENT[item.medium] }}
        >
          {MEDIUM_LABEL[item.medium]}
        </span>
        <h3 className={styles.cardTitle}>{item.title}</h3>
        <p className={styles.cardExcerpt}>{item.excerpt}</p>
        <p className={styles.cardMeta}>
          ♡ {item.likes} · {item.comments} commentaires
        </p>
      </div>
    </Link>
  );
}