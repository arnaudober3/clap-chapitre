import { ShareMenu } from '../../components/ui';
import type { Article } from '../../mock/types';
import styles from './Article.module.css';

/**
 * The social bar, between two hairlines. Desktop (4a): a "♡ J'aime · n" pill,
 * an "Enregistrer" text link, a spacer and an outlined "Partager" pill.
 * Mobile (4b): the compact row — "♡ n", the comment count and "Partager";
 * "Enregistrer" is hidden by CSS at the mobile breakpoint.
 *
 * "Partager" is the one live control: it opens the share menu. The others are
 * real <button>s that do nothing — no state, no navigation, no persistence.
 */
export default function SocialBar({ article }: { article: Article }) {
  return (
    <div className={styles.social} data-testid="article-social">
      {/* `.likeWord` is dropped at the mobile breakpoint, so the accessible
          name comes from the label rather than the visible text. */}
      <button
        type="button"
        className={styles.likePill}
        aria-label={`J’aime · ${article.likes}`}
      >
        <span aria-hidden="true">♡</span>
        <span className={styles.likeWord}>J’aime ·</span> {article.likes}
      </button>

      <span className={styles.commentCount}>
        <span aria-hidden="true">✎</span> {article.comments}
        <span className={styles.srOnly}> commentaires</span>
      </span>

      <button type="button" className={styles.saveLink}>
        Enregistrer
      </button>

      <span className={styles.socialSpacer} aria-hidden="true" />

      <ShareMenu
        title={article.title}
        excerpt={article.excerpt}
        triggerClassName={styles.sharePill}
        placement="top"
        data-testid="article-share"
      />
    </div>
  );
}
