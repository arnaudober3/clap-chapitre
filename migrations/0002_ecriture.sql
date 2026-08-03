-- L'écriture. 0001 a dessiné le contenu en supposant qu'une API l'écrirait un
-- jour ; c'est ce jour. Quatre manques à combler, et un seul est structurel.
--
-- Ce qui n'est PAS ici, volontairement : `articles.cover`. Elle porte désormais
-- une clé d'objet R2 au lieu d'un dégradé CSS, et la chaîne vide signifie « pas
-- encore d'affiche ». NOT NULL n'interdit pas la chaîne vide, donc rien à
-- migrer — or SQLite ne sait modifier une colonne qu'en recréant la table, avec
-- bilan_avis et article_related qui pointent dessus. On s'épargne ça pour rien.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- La file de modération
-- ---------------------------------------------------------------------------
-- Un commentaire public arrive en 'pending' et n'apparaît qu'une fois relu.
-- C'est le seul garde-fou qui tienne : le honeypot et la fenêtre glissante
-- filtrent le gros du bruit, mais ce qui passe quand même ne s'affiche pas.
--
-- Le défaut est 'approved', pas 'pending', et ce n'est pas une distraction : le
-- jeu d'exemple et les fixtures de test insèrent leurs commentaires sans cette
-- colonne. Un défaut 'pending' les rendrait invisibles et ferait tomber une
-- trentaine de tests de page pour la mauvaise raison. L'endpoint public écrit
-- 'pending' explicitement — c'est lui qui décide, pas le schéma.
ALTER TABLE comments ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'
  CHECK (status IN ('pending', 'approved'));

-- Horodatage de dépôt, distinct de comment_date : celle-ci est la date affichée
-- (NULL pour les réponses de l'autrice), celle-là sert à trier la file.
ALTER TABLE comments ADD COLUMN created_at TEXT;

CREATE INDEX idx_comments_moderation ON comments (status, created_at DESC);

-- ---------------------------------------------------------------------------
-- Le registre des likes
-- ---------------------------------------------------------------------------
-- Les colonnes `likes` de articles, bilans et comments restent le compteur
-- affiché ; cette table est ce qui le rend honnête. Le compteur est recalculé
-- depuis elle à chaque bascule, jamais incrémenté à l'aveugle — un double clic
-- ou un rechargement ne peut donc pas le faire dériver.
--
-- Pas de clé étrangère : comme comments, la cible est polymorphe, ici sur trois
-- tables. Le ménage se fait à la suppression, côté handler.
CREATE TABLE likes (
  target_type TEXT NOT NULL CHECK (target_type IN ('article', 'bilan', 'comment')),
  target_id   TEXT NOT NULL,
  -- SHA-256 de l'IP salée avec IP_SALT : de quoi dédupliquer sans conserver
  -- l'adresse. Une rotation du sel remet les likes à zéro, ce qui est la raison
  -- pour laquelle ce sel n'est pas JWT_SECRET.
  ip_hash     TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (target_type, target_id, ip_hash)
);

-- ---------------------------------------------------------------------------
-- La fenêtre glissante
-- ---------------------------------------------------------------------------
-- Le runtime est stateless et ne peut rien compter ; D1, si. Une ligne par
-- dépôt, un COUNT sur la fenêtre, une purge dans le même batch. Ce qu'une règle
-- WAF fait mieux, mais qu'elle ne permet ni de tester ni de vérifier en local.
CREATE TABLE rate_hits (
  bucket  TEXT NOT NULL,          -- 'comment' aujourd'hui, extensible
  ip_hash TEXT NOT NULL,
  hit_at  TEXT NOT NULL           -- ISO, comparé à datetime('now', '-N minutes')
);

CREATE INDEX idx_rate_hits ON rate_hits (bucket, ip_hash, hit_at);

-- ---------------------------------------------------------------------------
-- Le portrait de la page « À propos »
-- ---------------------------------------------------------------------------
-- Même bascule que les affiches : une vraie image, servie depuis R2.
-- portrait_label reste, et devient enfin ce qu'il prétendait être — le texte
-- alternatif. Chaîne vide = pas encore de portrait.
ALTER TABLE page_apropos ADD COLUMN portrait_image TEXT NOT NULL DEFAULT '';
