import { Link } from 'react-router-dom';
import { useAdminBilans, useAdminNewsletter } from '../../api/admin';
import { frNumber, ofMonth } from '../../format';
import { DEFAULT_BILAN_QUERY } from '../../content/query';
import styles from './AdminDashboard.module.css';

/**
 * Newsletter CTA: a dark-gradient card announcing the edition ready to send,
 * its real subscriber count, and a link to `/admin/newsletter`. The edition
 * named here is the newest published bilan — the same one the newsletter page
 * opens on — so the two can never disagree.
 *
 * Renders nothing while either request is in flight or there is no published
 * bilan yet: a teaser card is not worth a loading state of its own on a
 * dashboard that already has one.
 */
export default function NewsletterCta() {
  const bilans = useAdminBilans(DEFAULT_BILAN_QUERY, 1);
  const newsletter = useAdminNewsletter();

  const latest = bilans.data?.items[0];
  if (!latest || !newsletter.data) return null;

  const ready = !newsletter.data.sends.some((send) => send.bilanId === latest.id);

  return (
    <section className={styles.newsletter}>
      <div className={styles.newsletterText}>
        <div className={styles.newsletterTitle}>Newsletter {ofMonth(latest.monthLabel)}</div>
        <div className={styles.newsletterMeta}>
          {frNumber(newsletter.data.stats.total)} abonnés · {ready ? 'prête à partir' : 'envoyée'}
        </div>
      </div>
      <Link to="/admin/newsletter" className={styles.newsletterButton}>
        Envoyer
      </Link>
    </section>
  );
}
