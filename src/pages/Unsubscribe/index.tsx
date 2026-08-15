import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation } from '../../api/useMutation';
import { unsubscribeNewsletter } from '../../api/mutations';
import { Seo } from '../../seo/Seo';
import styles from './Unsubscribe.module.css';

/**
 * `/desinscription?token=...` — where the newsletter's "Se désabonner" link
 * lands. The link itself is a plain URL with no side effect (mail clients and
 * scanners prefetch links), so the actual unsubscribe happens here, once, on
 * mount, rather than on the click that opened this page.
 */
export default function UnsubscribePage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const mutation = useMutation(unsubscribeNewsletter);
  const { run } = mutation;

  // Guards against React 18 StrictMode's double-invoke in dev, and against the
  // token changing under an already-fired request.
  const fired = useRef<string>();

  useEffect(() => {
    if (!token || fired.current === token) return;
    fired.current = token;
    void run(token);
  }, [token, run]);

  return (
    <section className={styles.page} data-testid="unsubscribe-page">
      <Seo
          title="Désinscription"
          description="Se désabonner de la newsletter."
          path="/desinscription"
          noindex
        />
      <div className={styles.card}>
        {!token ? (
          <>
            <h1 className={styles.title}>Lien invalide</h1>
            <p className={styles.copy}>Ce lien de désinscription est incomplet.</p>
          </>
        ) : mutation.status === 'error' ? (
          <>
            <h1 className={styles.title}>Lien invalide</h1>
            <p className={styles.copy}>
              {mutation.error?.isNotFound
                ? "Ce lien de désinscription n'est plus valable."
                : "La désinscription n'a pas pu être confirmée."}
            </p>
          </>
        ) : mutation.status === 'done' ? (
          <>
            <h1 className={styles.title}>Vous êtes désabonné·e</h1>
            <p className={styles.copy}>Vous ne recevrez plus le courrier du mois.</p>
          </>
        ) : (
          <>
            <h1 className={styles.title}>Désinscription…</h1>
            <p className={styles.copy}>Un instant.</p>
          </>
        )}
        <Link to="/" className={styles.link}>
          Retour à l'accueil
        </Link>
      </div>
    </section>
  );
}
