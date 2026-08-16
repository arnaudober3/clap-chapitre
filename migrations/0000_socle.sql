-- Socle. Le contenu du site reste dans src/mock/ : cette base est vide par choix.
--
-- La seule table créée ici est une sonde. Elle rend le binding vérifiable de bout
-- en bout (GET /api/db-health) et force wrangler à initialiser sa table
-- `d1_migrations`, pour que la première vraie migration n'ait plus rien à
-- installer que son propre schéma.
CREATE TABLE IF NOT EXISTS schema_health (
  id      INTEGER PRIMARY KEY CHECK (id = 1),
  applied TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO schema_health (id) VALUES (1);
