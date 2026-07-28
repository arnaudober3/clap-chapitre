import { Link } from 'react-router-dom';
import type { Article } from '../../mock/types';
import { MEDIUM_LABEL } from '../../media';
import styles from './Home.module.css';

/**
 * Salon "Dernier avis" hero for the newest review of a page. Renders the
 * eyebrow, gradient cover, serif title, optional hook / "Pour ceux qui…"
 * callout, excerpt, like + comment counts, and the "Lire l'avis" link.
 */
export default function Hero({ item }: { item: Article }) {
  return (
    <section className={styles.hero} data-testid="home-hero">
      <div className={styles.heroCover} style={{ background: item.cover }} aria-hidden="true" />
      <div className={styles.heroBody}>
        <p className={styles.eyebrow}>
          Dernier avis · {MEDIUM_LABEL[item.medium]} · {item.date}
        </p>
        <h1 className={styles.heroTitle}>{item.title}</h1>
        {item.hook ? <p className={styles.heroHook}>{item.hook}</p> : null}
        <p className={styles.heroExcerpt}>{item.excerpt}</p>
        {item.forThoseWho ? (
          <p className={styles.callout}>{item.forThoseWho}</p>
        ) : null}
        <div className={styles.heroActions}>
          <Link to={`/article/${item.id}`} className={styles.readButton}>
            Lire l’avis
          </Link>
          <span className={styles.metaCount}>♡ {item.likes}</span>
          <span className={styles.metaCount}>{item.comments} commentaires</span>
        </div>
      </div>
    </section>
  );
}
