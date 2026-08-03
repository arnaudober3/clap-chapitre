import { Link } from 'react-router-dom';
import type { RelatedArticle } from '../../api/content';
import { MEDIUM_ACCENT, MEDIUM_LABEL } from '../../media';
import styles from './Article.module.css';

/**
 * The "À rapprocher de" block: up to two neighbouring avis, each a card linking
 * to `/article/<id>` with a gradient thumb (never an image element), the medium
 * label in that medium's accent, the serif title and the editorial note.
 *
 * Two columns on desktop, stacked full-width rows on mobile. When the avis has
 * no neighbours, the whole block — eyebrow included — is omitted.
 *
 * The links arrive resolved from `/api/articles/:id`, which drops unknown ids
 * and caps the list at two, so this component only lays them out.
 */
export default function RelatedGrid({ items }: { items: RelatedArticle[] }) {
  if (items.length === 0) return null;

  return (
    <section className={styles.related} data-testid="article-related">
      <p className={styles.relatedEyebrow}>À rapprocher de</p>
      <div className={styles.relatedGrid}>
        {items.map((item) => (
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
