import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  articleById,
  articleNeighbours,
  bilanForArticle,
} from '../../mock/articles';
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
 * It holds no data of its own: the `:id` route param is resolved through
 * `src/mock/articles.ts` — the avis itself, its owning bilan (for the
 * breadcrumb) and its neighbours (for the prev/next cards). An unknown, empty
 * or malformed id renders the Salon not-found state instead of dereferencing an
 * undefined avis. Navigating to another avis re-renders in place and resets the
 * scroll position.
 */
export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  const article = articleById(id ?? '');

  useEffect(() => {
    // Reading position resets when navigating between avis in place.
    try {
      window.scrollTo({ top: 0, left: 0 });
    } catch {
      /* non-scrolling environment (tests) */
    }
  }, [id]);

  if (!article) {
    return (
      <section className={styles.page} data-testid="article-page">
        <p className={styles.notFound}>Cet avis n’existe pas.</p>
        <Link className={styles.notFoundLink} to="/films">
          Revenir aux derniers avis
        </Link>
      </section>
    );
  }

  const bilan = bilanForArticle(article.id);
  const { prev, next } = articleNeighbours(article.id);

  return (
    <article className={styles.page} data-testid="article-page">
      <ArticleHero article={article} bilan={bilan} />
      <div className={styles.column}>
        <ArticleBody article={article} />
        <RelatedGrid article={article} />
        <ForThoseWho article={article} />
        <SocialBar article={article} />
        <PrevNext prev={prev} next={next} />
        <CommentThread />
      </div>
    </article>
  );
}
