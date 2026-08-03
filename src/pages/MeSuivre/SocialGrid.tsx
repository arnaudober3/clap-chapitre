import type { SocialLink } from '../../content/mesuivre';
import SocialCard from './SocialCard';
import styles from './MeSuivre.module.css';

/**
 * The 2×2 socials grid of design 3c (one column below the md breakpoint). An
 * empty list renders an empty grid rather than throwing.
 */
export default function SocialGrid({ socials }: { socials: SocialLink[] }) {
  return (
    <div className={styles.socialGrid} data-testid="social-grid">
      {socials.map((social) => (
        <SocialCard key={social.key} social={social} />
      ))}
    </div>
  );
}
