import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useArticleView } from '../../api/content';
import { useSetActiveMedium } from '../../components/layout/activeMedium';
import { PageError, PageLoading } from '../../components/ui';
import ArticleHero from './ArticleHero';
import ArticleBody, { ForThoseWho } from './ArticleBody';
import RelatedGrid from './RelatedGrid';
import SocialBar from './SocialBar';
import PrevNext from './PrevNext';
import CommentThread from './CommentThread';
import styles from './Article.module.css';

/**
 * The Salon single-avis page (`/article/:id`, designs 4a desktop / 4b mobile).
 *
 * It holds no data of its own: `/api/articles/:id` answers the avis, its owning
 * bilan (for the breadcrumb), its neighbours (for the prev/next cards), its
 * "à rapprocher de" links and its thread, all in one request.
 *
 * Three states, not two. When the data was synchronous, a missing avis could
 * only mean "does not exist"; now it also means "not here yet", and showing the
 * not-found copy while a request is in flight would make every navigation flash
 * an error. `notFound` is the 404 the server actually sent.
 *
 * The page also publishes the avis' medium to the shell, so the rail can keep a
 * selection on a route no feed matches — see `activeMedium.tsx`.
 */
export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const { data, status, notFound, reload } = useArticleView(id);

  useSetActiveMedium(data?.article.medium);

  useEffect(() => {
    // Reading position resets when navigating between avis in place.
    try {
      window.scrollTo({ top: 0, left: 0 });
    } catch {
      /* non-scrolling environment (tests) */
    }
  }, [id]);

  if (status === 'loading' || status === 'idle') {
    return (
      <section className={styles.page} data-testid="article-page" data-anim="stagger">
        <PageLoading />
      </section>
    );
  }

  if (notFound || (status === 'ready' && !data)) {
    return (
      <section className={styles.page} data-testid="article-page" data-anim="stagger">
        <p className={styles.notFound}>Cet avis n’existe pas.</p>
        <Link className={styles.notFoundLink} to="/films">
          Revenir aux derniers avis
        </Link>
      </section>
    );
  }

  if (!data) {
    return (
      <section className={styles.page} data-testid="article-page" data-anim="stagger">
        <PageError onRetry={reload} />
      </section>
    );
  }

  const { article, bilan, prev, next, related, comments } = data;

  return (
    <article className={styles.page} data-testid="article-page" data-anim="stagger">
      <ArticleHero article={article} bilan={bilan} />
      <div className={styles.column} data-anim="stagger">
        <ArticleBody article={article} />
        <RelatedGrid items={related} />
        <ForThoseWho article={article} />
        <SocialBar article={article} />
        <PrevNext prev={prev} next={next} />
        <CommentThread comments={comments} articleId={article.id} />
      </div>
    </article>
  );
}
