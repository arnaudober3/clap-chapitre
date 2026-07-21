import { Link } from 'react-router-dom';
import type { Article } from '../../mock/types';
import { relatedArticles } from '../../mock/articles';
import { MEDIUM_LABEL, MEDIUM_ACCENT } from './ArticleHero';
import styles from './Article.module.css';

/**
 * The "À rapprocher de" block: up to two neighbouring avis resolved from
 * `article.related`, each a card linking to `/article/<id>` with a gradient
 * thumb (never an image element), the medium label in that medium's accent, the serif
 * title and the editorial note.
 *
 * Two columns on desktop, stacked full-width rows on mobile. When nothing
 * resolves, the whole block — eyebrow included — is omitted.
 */
export default function RelatedGrid({ article }: { article: Article }) {
  const related = relatedArticles(article);
  if (related.length === 0) return null;

  return (
    <section className={styles.related} data-testid="article-related">
      <p className={styles.relatedEyebrow}>À rapprocher de</p>
      <div className={styles.relatedGrid}>
        {related.map((item) => (
          <Link
            key={item.id}
            to={`/article/${item.id}`}
            className={styles.relatedCard}
            data-testid="related-card"
          >
            <span
              className={styles.relatedThumb}
              style={{ background: item.cover }}
              aria-hidden="true"
            />
            <span className={styles.relatedBody}>
              <span
                className={styles.relatedMedium}
                style={{ color: MEDIUM_ACCENT[item.medium] }}
              >
                {MEDIUM_LABEL[item.medium]}
              </span>
              <span className={styles.relatedTitle}>{item.title}</span>
              <span className={styles.relatedNote}>{item.note}</span>
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
