import { Link } from 'react-router-dom';

/** 404 fallback. */
export default function NotFoundPage() {
  return (
    <section data-testid="not-found-page">
      <h1>Page introuvable</h1>
      <p>Cette page n'existe pas (encore).</p>
      <Link to="/">Retour à l'accueil</Link>
    </section>
  );
}
