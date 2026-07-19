import { useState } from 'react';
import styles from './Home.module.css';

/**
 * Presentational "Le courrier du mois" newsletter band. The form is inert: it
 * prevents default on submit so it never navigates, reloads, or throws — there
 * is no backend and no real validation in this prototype.
 */
export default function Newsletter() {
  const [email, setEmail] = useState('');

  return (
    <section className={styles.newsletter}>
      <div className={styles.newsletterInner}>
        <h2 className={styles.newsletterTitle}>Le courrier du mois</h2>
        <p className={styles.newsletterCopy}>
          Une lettre par mois : les avis marquants, les découvertes et les
          histoires à ne pas manquer.
        </p>
        <form
          className={styles.newsletterForm}
          onSubmit={(event) => event.preventDefault()}
        >
          <input
            type="email"
            className={styles.newsletterInput}
            placeholder="votre@email.fr"
            aria-label="Adresse e-mail"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <button type="submit" className={styles.newsletterButton}>
            S’abonner
          </button>
        </form>
      </div>
    </section>
  );
}
