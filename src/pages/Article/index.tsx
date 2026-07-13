import { useParams } from 'react-router-dom';

/**
 * Article view placeholder. The real article UI is designed by the owner
 * before subtask 03 — this only wires the route.
 */
export default function ArticlePage() {
  const { id } = useParams<{ id: string }>();
  return (
    <section data-testid="article-page">
      <h1>Avis</h1>
      <p>Article {id}</p>
    </section>
  );
}
