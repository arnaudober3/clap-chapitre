-- L'Alt text du portrait n'a plus de raison d'être une colonne : la page
-- publique la fixe désormais dans le code (Hero.tsx), et l'éditrice n'a plus
-- de champ pour la faire varier. portrait_label ne servait déjà à rien côté
-- rendu — jamais lu par la page publique — et devient un pur poids mort.

PRAGMA foreign_keys = ON;

ALTER TABLE page_apropos DROP COLUMN portrait_label;
