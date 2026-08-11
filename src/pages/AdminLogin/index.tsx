import { useRef, useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import useReveal from '../../anim/useReveal';
import { Seo } from '../../seo/Seo';
import { ADMIN_LOGIN_TITLE } from '../../seo/staticCopy';
import styles from './AdminLogin.module.css';

/**
 * Admin sign-in page.
 *
 * Deliberately outside the admin shell: no rail, no drawer, no section nav —
 * a single centred card on the cream page, in the same Salon register as the
 * rest of the site. It is the only place in the app where a failed action
 * surfaces an error message, so the error style is born here.
 *
 * Landing: back to wherever RequireAuth intercepted the visitor, or the
 * dashboard when they came straight to /admin/login.
 */
interface FromState {
  from?: { pathname?: string };
}

export default function AdminLoginPage() {
  const { status, signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // This page is its own <main>, outside both shells, so it arms its own reveal
  // instead of inheriting the one Layout/AdminLayout set up. Above the hooks
  // rule: it has to run before the early return below.
  const pageRef = useRef<HTMLElement>(null);
  useReveal(pageRef, 'admin-login');

  const from = (location.state as FromState | null)?.from?.pathname ?? '/admin';

  // Already signed in: this page has nothing to offer.
  if (status === 'authenticated') {
    return <Navigate to="/admin" replace />;
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    const result = await signIn(username, password);
    setSubmitting(false);
    if (result.ok) {
      navigate(from, { replace: true });
      return;
    }
    setPassword('');
    setError(result.error);
  }

  return (
    <main
      className={styles.page}
      data-testid="admin-login-page"
      data-anim="stagger"
      ref={pageRef}
    >
      <Seo title={ADMIN_LOGIN_TITLE} path="/admin/login" noindex />
      <section className={styles.card}>
        <p className={styles.eyebrow}>Espace admin</p>
        <h1 className={styles.title}>
          Clap <span className={styles.et}>et</span> chapitre
        </h1>
        <p className={styles.lede}>
          Connecte-toi pour accéder à l’administration du site.
        </p>

        <form className={styles.form} onSubmit={onSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-username">
              Identifiant
            </label>
            <input
              id="login-username"
              className={styles.input}
              type="text"
              value={username}
              autoComplete="username"
              autoFocus
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="login-password">
              Mot de passe
            </label>
            <input
              id="login-password"
              className={styles.input}
              type="password"
              value={password}
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className={styles.submit}
            disabled={submitting}
          >
            {submitting ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </section>

      <Link to="/" className={styles.backLink}>
        ← Retour au site
      </Link>
    </main>
  );
}
