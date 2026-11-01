-- L'annonce d'un avis aux abonné·es. Jusqu'ici, seul « Le courrier du mois »
-- partait par e-mail ; publier un avis ne prévenait personne.
--
-- Une ligne par avis annoncé, et jamais plus d'une : la clé primaire est ce
-- qui empêche deux onglets — ou un dépublier/republier — d'envoyer deux fois
-- la même annonce. La route la réserve (INSERT OR IGNORE) *avant* d'envoyer,
-- et la retire seulement si aucun message n'est parti, pour qu'on puisse
-- réessayer.
--
-- Pas de clé étrangère vers articles : l'historique survit à un avis supprimé,
-- même choix que newsletter_sends (0004) et view_hits (0003).

PRAGMA foreign_keys = ON;

CREATE TABLE article_announcements (
  article_id       TEXT PRIMARY KEY,
  subject          TEXT NOT NULL,
  title            TEXT NOT NULL,
  sent_at          TEXT NOT NULL,
  recipient_count  INTEGER NOT NULL DEFAULT 0,
  failure_count    INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_article_announcements_sent_at ON article_announcements (sent_at);
