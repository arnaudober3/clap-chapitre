import { useLike } from '../../api/useLike';
import { ShareMenu } from '../../components/ui';
import type { Article } from '../../../shared/content';
import styles from './Article.module.css';

/**
 * The social bar, between two hairlines. Desktop (4a): a "♡ J'aime · n" pill,
 * an "Enregistrer" text link, a spacer and an outlined "Partager" pill.
 * Mobile (4b): the compact row — "♡ n", the comment count and "Partager";
 * "Enregistrer" is hidden by CSS at the mobile breakpoint.
 *
 * "Partager" opens the share menu. "Enregistrer" is inert. The like pill now
 * calls POST /api/likes to toggle the visitor's ♡, deduped per address.
 */
export default function SocialBar({ article }: { article: Article }) {
  const like = useLike('article', article.id, article.likes);

  return (
    <div className={styles.social} data-testid="article-social">
      {/* `.likeWord` is dropped at the mobile breakpoint, so the accessible
          name comes from the label rather than the visible text. */}
      <button
        type="button"
        className={styles.likePill}
        aria-label={`J'aime · ${like.likes}`}
        aria-pressed={like.liked}
        disabled={like.pending}
        onClick={like.toggle}
      >
        <span aria-hidden="true">{like.liked ? '♥' : '♡'}</span>
        <span className={styles.likeWord}>J'aime ·</span> {like.likes}
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
