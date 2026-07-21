import type { SocialLink } from '../../mock/mesuivre';
import styles from './MeSuivre.module.css';

/**
 * Swatch colour per platform. An unknown key falls back to --ink so the style
 * always resolves to a defined token rather than 'var(--social-undefined)'.
 */
const SWATCH: Record<string, string | undefined> = {
  threads: 'var(--social-threads)',
  letterboxd: 'var(--social-letterboxd)',
  babelio: 'var(--social-babelio)',
  linkedin: 'var(--social-linkedin)',
};

/**
 * One social card of design 3c. The whole card is a single external anchor —
 * these links leave the SPA, so they are plain <a target="_blank"
 * rel="noopener noreferrer">, never a react-router Link and never href="#".
 */
export default function SocialCard({ social }: { social: SocialLink }) {
  const { name, handle, glyph, url, cta } = social;
  const background = SWATCH[social.key] ?? 'var(--ink)';
  const wide = glyph.length > 1;

  return (
    <a
      className={styles.socialCard}
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="social-card"
    >
      <span
        className={`${styles.socialSwatch}${wide ? ` ${styles.socialSwatchWide}` : ''}`}
        style={{ background }}
        data-testid="social-swatch"
        aria-hidden="true"
      >
        {glyph}
      </span>
      <span className={styles.socialBody}>
        <span className={styles.socialName}>{name}</span>
        <span className={styles.socialHandle}>{handle}</span>
      </span>
      <span className={styles.socialCta}>{cta}</span>
    </a>
  );
}
