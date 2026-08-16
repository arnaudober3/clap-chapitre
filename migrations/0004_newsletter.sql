-- La newsletter. Jusqu'ici un prototype tenu à la main dans src/mock/newsletter.ts :
-- des chiffres d'audience figés, un historique d'envois inventé. Deux tables
-- suffisent à la rendre réelle.
--
-- newsletter_subscribers porte l'identité elle-même — un e-mail entre et
-- sort de la liste. newsletter_sends porte l'historique des envois réels, un
-- par bilan mailé : le contenu n'y est pas gelé (seuls bilan_id et subject le
-- sont), il est régénéré depuis le bilan à l'instant de l'envoi, pour qu'une
-- coquille corrigée entre la programmation et le départ parte corrigée.
--
-- Un envoi de test n'écrit jamais ici : « Derniers envois » est un historique
-- public-facing, une salve de test à une adresse privée n'y a pas sa place.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Les abonné·es
-- ---------------------------------------------------------------------------
-- L'e-mail est la clé : pas d'identifiant de substitution, comme partout
-- ailleurs dans ce schéma où le texte naturel suffit (articles.id, bilans.id).
--
-- unsubscribe_token est un HMAC-SHA256(NEWSLETTER_UNSUB_SECRET, email), calculé
-- une fois et stocké — la vérification est une lecture indexée, pas un
-- recalcul. Un secret dédié, pas JWT_SECRET : une rotation de session ne doit
-- pas invalider les liens de désabonnement déjà partis dans une boîte de
-- réception, la même raison qui garde IP_SALT séparé de JWT_SECRET.
CREATE TABLE newsletter_subscribers (
  email             TEXT PRIMARY KEY,
  status            TEXT NOT NULL DEFAULT 'subscribed'
                       CHECK (status IN ('subscribed', 'unsubscribed')),
  -- Réinitialisé à chaque (ré)abonnement : c'est ce qui nourrit le delta de
  -- croissance à 30 jours glissants.
  subscribed_at     TEXT NOT NULL,
  unsubscribed_at   TEXT,
  unsubscribe_token TEXT NOT NULL UNIQUE,
  CHECK ((status = 'subscribed') = (unsubscribed_at IS NULL))
);

CREATE INDEX idx_newsletter_subscribers_status ON newsletter_subscribers (status);
CREATE INDEX idx_newsletter_subscribers_subscribed_at ON newsletter_subscribers (subscribed_at);
CREATE INDEX idx_newsletter_subscribers_unsubscribed_at ON newsletter_subscribers (unsubscribed_at);

-- ---------------------------------------------------------------------------
-- Les envois
-- ---------------------------------------------------------------------------
-- Pas de clé étrangère vers bilans : l'historique doit survivre à un bilan
-- modifié ou supprimé par la suite, même choix que view_hits/share_hits (0003).
--
-- Ni 'draft' ni 'canceled' : l'interface compose puis envoie ou programme,
-- jamais n'enregistre un brouillon ; annuler une programmation est une
-- suppression pure de la ligne.
CREATE TABLE newsletter_sends (
  id               TEXT PRIMARY KEY,
  bilan_id         TEXT NOT NULL,
  subject          TEXT NOT NULL,
  title            TEXT NOT NULL,
  status           TEXT NOT NULL CHECK (status IN ('scheduled', 'sent', 'failed')),
  -- Instant UTC. Programmée : non nul. Envoyée : sent_at non nul.
  scheduled_at     TEXT,
  sent_at          TEXT,
  recipient_count  INTEGER NOT NULL DEFAULT 0,
  failure_count    INTEGER NOT NULL DEFAULT 0,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK ((status = 'scheduled') = (scheduled_at IS NOT NULL AND sent_at IS NULL)),
  CHECK ((status = 'sent') = (sent_at IS NOT NULL))
);

CREATE INDEX idx_newsletter_sends_status ON newsletter_sends (status, scheduled_at);

-- Au plus une programmation active par bilan, à l'image du créneau unique que
-- l'interface propose par source. Index partiel : une fois envoyée ou en échec,
-- une ligne ne compte plus dans cette contrainte, et un nouvel envoi du même
-- bilan (rare, mais possible après correction) peut se reprogrammer.
CREATE UNIQUE INDEX idx_newsletter_sends_one_scheduled_per_bilan
  ON newsletter_sends (bilan_id) WHERE status = 'scheduled';
