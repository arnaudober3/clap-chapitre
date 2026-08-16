-- L'audience réelle : ce que 0001 avait laissé de côté faute d'une table
-- d'événements. Elle existe maintenant, et stat_kpis / stat_trend — des
-- constantes saisies à la main — n'ont plus de raison d'être.
--
-- Deux registres, sur le même modèle que rate_hits : une ligne par événement,
-- pas de clé étrangère (cible polymorphe sur articles/bilans), pas de purge —
-- contrairement à rate_hits, ces lignes doivent survivre pour nourrir la
-- courbe des 12 mois.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------------
-- Les vues
-- ---------------------------------------------------------------------------
-- N'a pas d'ip_hash : à la différence des likes, une vue ne se bascule pas,
-- elle se compte. Le compteur rapide (articles.views / bilans.views) reste la
-- source du palmarès ; cette table est ce qui rend la tendance et les deltas
-- de période calculables.
CREATE TABLE view_hits (
  target_type TEXT NOT NULL CHECK (target_type IN ('article', 'bilan')),
  target_id   TEXT NOT NULL,
  viewed_at   TEXT NOT NULL
);

CREATE INDEX idx_view_hits ON view_hits (target_type, target_id, viewed_at);

-- ---------------------------------------------------------------------------
-- Les partages
-- ---------------------------------------------------------------------------
CREATE TABLE share_hits (
  target_type TEXT NOT NULL CHECK (target_type IN ('article', 'bilan')),
  target_id   TEXT NOT NULL,
  channel     TEXT NOT NULL CHECK (channel IN ('facebook', 'x', 'whatsapp', 'email', 'copy')),
  created_at  TEXT NOT NULL
);

CREATE INDEX idx_share_hits ON share_hits (target_type, target_id, created_at);

-- ---------------------------------------------------------------------------
-- Les statistiques du tableau de bord
-- ---------------------------------------------------------------------------
-- stat_periods reste : ce n'est pas du contenu, c'est la configuration du
-- sélecteur de période, et un sélecteur vide n'est pas un état vide valide —
-- contrairement à articles ou bilans, elle est donc semée ici plutôt que dans
-- examples/contenu-exemple.sql.
INSERT INTO stat_periods (id, label, position, is_default) VALUES
  ('7j',  '7 derniers jours',   1, 0),
  ('30j', '30 derniers jours',  2, 1),
  ('12m', '12 derniers mois',   3, 0);

-- stat_kpis et stat_trend, eux, n'étaient que le contournement : ce qu'ils
-- portaient à la main se déduit maintenant de view_hits, share_hits, likes et
-- comments.
DROP TABLE stat_kpis;
DROP TABLE stat_trend;
