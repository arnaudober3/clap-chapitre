import { Link } from 'react-router-dom';
import { newsletter } from '../../mock/dashboard';
import { frNumber } from './format';
import styles from './AdminDashboard.module.css';

/**
 * Newsletter CTA (design 6b): a dark-gradient card announcing the edition ready
 * to send, its subscriber count, and an "Envoyer" action (mock affordance).
 */
export default function NewsletterCta() {
  const status = newsletter();

  return (
    <section className={styles.newsletter}>
      <div className={styles.newsletterText}>
        <div className={styles.newsletterTitle}>{status.edition}</div>
        <div className={styles.newsletterMeta}>
          {frNumber(status.subscribers)} abonnés · {status.ready ? 'prête à partir' : 'brouillon'}
        </div>
      </div>
      <Link to="/admin/newsletter" className={styles.newsletterButton}>
        Envoyer
      </Link>
    </section>
  );
}
