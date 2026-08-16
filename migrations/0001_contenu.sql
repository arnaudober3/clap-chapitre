-- Le contenu du site : avis, bilans, commentaires, pages éditoriales, statistiques.
--
-- Cette migration installe la structure et RIEN d'autre. Aucune ligne de contenu :
-- la base reste vide tant que l'éditrice n'y écrit pas, et le site sait afficher
-- ses états vides. Un jeu de démonstration existe hors migrations, dans
-- examples/contenu-exemple.sql — il n'est jamais appliqué automatiquement.
--
-- Conventions tenues partout ici :
--   * snake_case, et le vocabulaire métier reste en français (bilan, avis, medium)
--     puisque les types TypeScript le nomment déjà ainsi.
--   * les dates sont du TEXT ISO. Un jour se lit 'AAAA-MM-JJ' et se trie tel quel ;
--     la date française affichée ("18 juillet 2026") n'est jamais stockée, elle est
--     reconstruite au rendu par src/format.ts. Deux écritures de la même date, ça
--     diverge toujours.
--   * les booléens sont des INTEGER contraints à (0,1).
--   * les colonnes nullables signifient « absent », pas « vide » : le hero ne rend
--     pas un hook manquant comme un hook vide.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Les avis
-- ---------------------------------------------------------------------------
-- Une seule table pour les avis de la page d'accueil et ceux rattachés à un bilan.
-- Le prototype tenait deux ensembles distincts (mock/home.ts et les `avis` imbriqués
-- dans mock/bilans.ts), ce qui rendait un avis de bilan accessible en /article/:id
-- mais invisible dans les archives. Une table unique fait disparaître l'écart.
CREATE TABLE articles (
  id               TEXT PRIMARY KEY,
  title            TEXT NOT NULL,
  medium           TEXT NOT NULL CHECK (medium IN ('film', 'serie', 'livre', 'doc')),
  excerpt          TEXT NOT NULL,
  -- Un dégradé CSS, jamais une URL : le site est sans requête réseau pour ses visuels.
  cover            TEXT NOT NULL,
  author           TEXT NOT NULL DEFAULT 'Marie-Zoé',
  status           TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  -- Publié ⇔ daté. L'équivalence est écrite dans les deux sens pour qu'un brouillon
  -- ne puisse pas porter de date de publication, ni un avis en ligne en manquer.
  published_at     TEXT,
  -- Sert le "Modifié il y a 2 jours" des brouillons, calculé à l'affichage.
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  likes            INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  -- Compteur de vues : jamais affiché publiquement, seul le back-office le lit.
  views            INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  hook             TEXT,
  for_those_who    TEXT,
  -- Paragraphes séparés par une ligne vide, comme le rendu les redécoupe.
  body             TEXT,
  genre_meta       TEXT,
  reading_time     TEXT,
  pull_quote       TEXT,
  -- « À rapprocher de » lorsqu'il s'agit d'une œuvre extérieure au site, citée par
  -- son titre. Le cas « un autre avis d'ici » a sa propre table plus bas.
  related_to_title TEXT,
  related_to_note  TEXT,
  CHECK ((status = 'published') = (published_at IS NOT NULL)),
  CHECK ((related_to_title IS NULL) = (related_to_note IS NULL))
);

-- Le feed d'un médium, et le catalogue complet, dans l'ordre où ils s'affichent.
CREATE INDEX idx_articles_status_date  ON articles (status, published_at DESC);
CREATE INDEX idx_articles_medium_date  ON articles (medium, status, published_at DESC);
-- Le tri « Plus vus » du back-office et le palmarès du tableau de bord.
CREATE INDEX idx_articles_status_views ON articles (status, views DESC);

-- ---------------------------------------------------------------------------
-- Les bilans mensuels
-- ---------------------------------------------------------------------------
CREATE TABLE bilans (
  id           TEXT PRIMARY KEY CHECK (id GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]'),
  year         INTEGER NOT NULL,
  month        INTEGER NOT NULL CHECK (month BETWEEN 1 AND 12),
  -- Stocké, contrairement à la date d'un avis : la recherche du back-office porte
  -- sur « mois + année + titre », et une colonne rend cette recherche exprimable
  -- d'un seul LIKE. C'est aussi la seule façon pour l'éditrice de corriger un
  -- libellé sans toucher au numéro de mois.
  month_label  TEXT NOT NULL,
  title        TEXT NOT NULL,
  mood         TEXT,
  status       TEXT NOT NULL CHECK (status IN ('draft', 'published')),
  published_at TEXT,
  updated_at   TEXT NOT NULL DEFAULT (datetime('now')),
  views        INTEGER NOT NULL DEFAULT 0 CHECK (views >= 0),
  likes        INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  CHECK ((status = 'published') = (published_at IS NOT NULL))
);

CREATE INDEX idx_bilans_status_date  ON bilans (status, published_at DESC);
CREATE INDEX idx_bilans_year_month   ON bilans (year DESC, month DESC);
CREATE INDEX idx_bilans_status_views ON bilans (status, views DESC);

-- Quels avis composent quel bilan, dans quel ordre.
--
-- Une table de jonction plutôt qu'une colonne bilan_id sur les avis : le sélecteur
-- de coups de cœur du back-office propose délibérément des avis d'autres mois, donc
-- rien n'interdit qu'un même avis soit repris par deux bilans. Le fil d'Ariane d'un
-- avis prend simplement le bilan le plus récent qui le contient.
--
-- `position` porte un ordre éditorial, pas un regroupement par médium : un bilan
-- peut se lire livre, film, livre si c'est ainsi que le mois se raconte.
CREATE TABLE bilan_avis (
  bilan_id   TEXT    NOT NULL REFERENCES bilans (id)   ON DELETE CASCADE,
  article_id TEXT    NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  position   INTEGER NOT NULL,
  PRIMARY KEY (bilan_id, article_id),
  UNIQUE (bilan_id, position)
);

CREATE INDEX idx_bilan_avis_article ON bilan_avis (article_id);

-- Les pastilles « œuvres par médium » d'un bilan.
--
-- Elles ne sont PAS déduites de bilan_avis, et c'est volontaire : les mois anciens
-- du listing back-office affichent leurs compteurs sans porter le détail de leurs
-- avis. Les compter reviendrait à afficher zéro partout sur ces mois-là.
CREATE TABLE bilan_counts (
  bilan_id TEXT    NOT NULL REFERENCES bilans (id) ON DELETE CASCADE,
  medium   TEXT    NOT NULL CHECK (medium IN ('film', 'serie', 'livre', 'doc')),
  count    INTEGER NOT NULL CHECK (count >= 0),
  PRIMARY KEY (bilan_id, medium)
);

-- ---------------------------------------------------------------------------
-- « À rapprocher de » — les renvois vers un autre avis du site
-- ---------------------------------------------------------------------------
-- La structure fait gratuitement ce que le sélecteur faisait à la main : la clé
-- étrangère écarte un identifiant inconnu, la clé primaire les doublons, le CHECK
-- l'auto-référence, et la lecture applique son propre LIMIT 2.
CREATE TABLE article_related (
  article_id TEXT    NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  related_id TEXT    NOT NULL REFERENCES articles (id) ON DELETE CASCADE,
  note       TEXT    NOT NULL,
  position   INTEGER NOT NULL,
  PRIMARY KEY (article_id, related_id),
  CHECK (article_id <> related_id)
);

-- ---------------------------------------------------------------------------
-- Les commentaires
-- ---------------------------------------------------------------------------
-- Une table pour les deux fils (avis et bilan) : même forme, même rendu, et deux
-- tables auraient dupliqué le déclencheur, les index et la conversion.
--
-- Pas de clé étrangère sur target_id — elle pointe vers deux tables selon
-- target_type, ce que SQLite ne sait pas exprimer. Le ménage se fait par
-- déclencheur à la suppression, en attendant qu'une écriture existe.
CREATE TABLE comments (
  id           TEXT PRIMARY KEY,
  target_type  TEXT NOT NULL CHECK (target_type IN ('article', 'bilan')),
  target_id    TEXT NOT NULL,
  -- Une réponse, et une seule profondeur : le déclencheur ci-dessous l'impose.
  parent_id    TEXT REFERENCES comments (id) ON DELETE CASCADE,
  author       TEXT NOT NULL,
  is_author    INTEGER NOT NULL DEFAULT 0 CHECK (is_author IN (0, 1)),
  body         TEXT NOT NULL,
  -- NULL = pas de date affichée. C'est le cas des réponses de l'autrice, qui
  -- portent une pastille « autrice » à la place.
  comment_date TEXT,
  likes        INTEGER NOT NULL DEFAULT 0 CHECK (likes >= 0),
  position     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_comments_target ON comments (target_type, target_id, position);
CREATE INDEX idx_comments_parent ON comments (parent_id);

-- Le fil n'a qu'un niveau de réponse : l'interface rend `reply`, pas `replies`, et
-- aucune maquette n'imbrique plus loin. Comme rien n'écrit dans cette base par API
-- pour l'instant, ce déclencheur est le seul garde-fou d'une insertion à la main.
CREATE TRIGGER comments_single_depth
BEFORE INSERT ON comments
WHEN NEW.parent_id IS NOT NULL
  AND (SELECT parent_id FROM comments WHERE id = NEW.parent_id) IS NOT NULL
BEGIN
  SELECT RAISE(ABORT, 'Un commentaire ne peut pas répondre à une réponse.');
END;

-- Une réponse appartient au même fil que le commentaire auquel elle répond.
CREATE TRIGGER comments_same_target
BEFORE INSERT ON comments
WHEN NEW.parent_id IS NOT NULL
  AND (SELECT target_type || ':' || target_id FROM comments WHERE id = NEW.parent_id)
      <> (NEW.target_type || ':' || NEW.target_id)
BEGIN
  SELECT RAISE(ABORT, 'Une réponse doit viser le même contenu que son parent.');
END;

-- ---------------------------------------------------------------------------
-- Les pages éditoriales
-- ---------------------------------------------------------------------------
-- Des colonnes, pas un document JSON. Trois raisons : les formulaires du
-- back-office éditent champ par champ et réordonnent les listes, ce qu'une table
-- ordonnée exprime directement ; un document opaque annule toute contrainte ; et
-- le contenu s'insère à la main, or du JSON français échappé dans du SQL est
-- illisible. Seules les listes que l'interface réordonne ont leur propre table.

CREATE TABLE page_apropos (
  id              INTEGER PRIMARY KEY CHECK (id = 1),
  eyebrow         TEXT NOT NULL,
  greeting        TEXT NOT NULL,
  name            TEXT NOT NULL,
  intro           TEXT NOT NULL,
  portrait_label  TEXT NOT NULL,
  -- Paragraphes séparés par une ligne vide, même convention que articles.body.
  bio             TEXT NOT NULL,
  -- Les termes mis en gras dans la bio, un par ligne. Vide = aucun.
  bio_emphasis    TEXT NOT NULL DEFAULT '',
  quote           TEXT NOT NULL,
  stats_title     TEXT NOT NULL,
  follow_title    TEXT NOT NULL,
  follow_copy     TEXT NOT NULL,
  follow_cta      TEXT NOT NULL,
  follow_to       TEXT NOT NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE apropos_stats (
  position INTEGER PRIMARY KEY,
  label    TEXT    NOT NULL,
  value    INTEGER NOT NULL
);

CREATE TABLE page_mesuivre (
  id                     INTEGER PRIMARY KEY CHECK (id = 1),
  eyebrow                TEXT NOT NULL,
  title                  TEXT NOT NULL,
  intro                  TEXT NOT NULL,
  newsletter_eyebrow     TEXT NOT NULL,
  newsletter_title       TEXT NOT NULL,
  newsletter_copy        TEXT NOT NULL,
  newsletter_placeholder TEXT NOT NULL,
  newsletter_cta         TEXT NOT NULL,
  updated_at             TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE mesuivre_socials (
  key      TEXT    PRIMARY KEY,
  position INTEGER NOT NULL UNIQUE,
  name     TEXT    NOT NULL,
  handle   TEXT    NOT NULL,
  -- Le sigle affiché dans la pastille ('Th', 'Lb'…).
  glyph    TEXT    NOT NULL,
  url      TEXT    NOT NULL,
  cta      TEXT    NOT NULL
);

-- ---------------------------------------------------------------------------
-- Les statistiques du tableau de bord
-- ---------------------------------------------------------------------------
-- Règle appliquée : tout ce qui peut se déduire des tables de contenu s'en déduit.
-- Le palmarès, la liste des brouillons et le pic de la courbe sont calculés à la
-- lecture. Restent ici les chiffres qu'aucune table ne porte — il faudrait une
-- table d'événements d'audience, hors de ce périmètre en lecture seule.

CREATE TABLE stat_periods (
  id         TEXT    PRIMARY KEY,
  label      TEXT    NOT NULL,
  position   INTEGER NOT NULL,
  is_default INTEGER NOT NULL DEFAULT 0 CHECK (is_default IN (0, 1))
);

-- Une seule période par défaut, ou aucune. Le client retombe sinon sur la première.
CREATE UNIQUE INDEX idx_stat_periods_default ON stat_periods (is_default) WHERE is_default = 1;

CREATE TABLE stat_kpis (
  period_id TEXT    NOT NULL REFERENCES stat_periods (id) ON DELETE CASCADE,
  key       TEXT    NOT NULL,
  label     TEXT    NOT NULL,
  value     INTEGER NOT NULL,
  -- Variation par rapport à la fenêtre précédente, en points de pourcentage.
  -- Négative quand la mesure recule : l'interface a une flèche pour ça.
  delta_pct INTEGER NOT NULL,
  position  INTEGER NOT NULL,
  PRIMARY KEY (period_id, key)
);

CREATE TABLE stat_trend (
  position    INTEGER PRIMARY KEY,
  month_label TEXT    NOT NULL,
  views       INTEGER NOT NULL CHECK (views >= 0)
);
