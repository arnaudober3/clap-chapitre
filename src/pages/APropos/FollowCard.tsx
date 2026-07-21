import { Link } from 'react-router-dom';
import styles from './APropos.module.css';

/**
 * The dark "On se suit ?" follow CTA card: cream serif title, muted copy and a
 * gold pill react-router <Link> (client-side navigation — not a bare <a href>,
 * not a dead '#').
 */
export default function FollowCard({
  title,
  copy,
  cta,
  to,
}: {
  title: string;
  copy: string;
  cta: string;
  to: string;
}) {
  return (
    <section className={styles.followCard} data-testid="follow-card">
      {title ? <p className={styles.followTitle}>{title}</p> : null}
      {copy ? <p className={styles.followCopy}>{copy}</p> : null}
      <Link to={to} className={styles.followCta}>
        {cta}
      </Link>
    </section>
  );
}
