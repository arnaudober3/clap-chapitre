import { coverStyle } from '../../api/mutations';
import styles from './APropos.module.css';

/**
 * Design-3b À propos hero band: a gradient band with a round portrait
 * (a real image when one has been uploaded; a CSS gradient placeholder
 * otherwise), the uppercase --accent eyebrow, the serif H1 "<greeting>
 * <i>name</i>" and the serif --muted intro. Every slot is optional-safe:
 * empty strings render no empty element and never throw.
 */
export default function Hero({
  eyebrow,
  greeting,
  name,
  intro,
  portraitImage,
}: {
  eyebrow: string;
  greeting: string;
  name: string;
  intro: string;
  portraitImage: string;
}) {
  return (
    <section className={styles.hero} data-testid="a-propos-hero">
      {/* The band paints edge-to-edge; this inner track keeps its content on the
          same --shell-max column as the rest of the page. */}
      <div className={styles.heroInner}>
        <div className={styles.portrait} style={coverStyle(portraitImage)} data-testid="a-propos-portrait" />
        <div className={styles.heroBody}>
          {eyebrow ? <p className={styles.eyebrow}>{eyebrow}</p> : null}
          <h1 className={styles.heroTitle}>
            {greeting ? `${greeting} ` : ''}
            {name ? <span className={styles.heroName}>{name}</span> : null}
          </h1>
          {intro ? <p className={styles.heroIntro}>{intro}</p> : null}
        </div>
      </div>
    </section>
  );
}
