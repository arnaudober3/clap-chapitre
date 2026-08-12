-- Jeu de démonstration — NON appliqué automatiquement.
--
-- Ce fichier vit hors de migrations/, que wrangler est seul à lire : il ne peut
-- donc pas devenir un seed par accident, ni partir en production. Il sert à voir
-- le site vivre en local, et de modèle quand l'éditrice saisit son vrai contenu.
--
--     npm run db:example        (l'applique à la base locale)
--     npm run db:reset          (repart d'une base vide)
--
-- Deux pièges d'insertion à la main, appris à l'usage :
--
--   1. L'apostrophe. En SQL elle se double ('l''année'), et `npm run db:sql` passe
--      en plus toute la requête au shell en un seul argument. Dès qu'il y a une
--      apostrophe — c'est-à-dire presque toujours en français — passer par un
--      fichier et --file, comme ici, plutôt que par --command.
--   2. L'ordre. Les clés étrangères sont actives : un bilan avant ses avis liés,
--      un commentaire avant sa réponse. L'ordre ci-dessous est celui qui marche.
--
-- Après coup, `npm run db:sql -- "PRAGMA foreign_key_check"` ne doit rien dire.

-- ---------------------------------------------------------------------------
-- Les avis
-- ---------------------------------------------------------------------------
INSERT INTO articles
  (id, title, medium, excerpt, cover, status, published_at, likes, views,
   hook, for_those_who, genre_meta, reading_time, pull_quote, body)
VALUES
  ('un-dernier-ete', 'Un dernier été', 'film',
   'Un huis clos solaire où chaque silence pèse plus lourd que les mots.',
   '',
   'published', '2026-07-18', 128, 2180,
   'Et si le dernier été n''était jamais vraiment le dernier ?',
   'Pour ceux qui aiment les fins qui laissent la fenêtre entrouverte.',
   'Comédie dramatique · 2 h 04 · 2026',
   '4 min de lecture',
   'Rien n''explose : tout se déplace d''un millimètre, et c''est là que le film devient bouleversant.',
   'Il y a des films qui ressemblent à une maison qu''on quitte en septembre.

On y entre par une porte ouverte, on en ressort avec du sable dans les poches.'),

  ('l-annee-de-la-pluie', 'L''année de la pluie', 'livre',
   'Une chronique d''amitié qui vieillit, écrite à hauteur de flaque.',
   '',
   'published', '2026-07-04', 74, 1210,
   'Peut-on relire une amitié comme on relit un livre ?',
   'Pour ceux qui gardent les lettres qu''ils n''ont pas envoyées.',
   'Roman · 264 pages · 2026',
   '5 min de lecture',
   NULL,
   'Le livre avance au rythme des averses, sans jamais forcer la métaphore.

C''est sa politesse, et c''est ce qui le rend inoubliable.'),

  -- Un brouillon : pas de date de publication, aucun compteur, et le back-office
  -- est le seul endroit où il apparaît.
  ('contre-champs', 'Contre-champs', 'serie',
   'Notes en cours sur une série qui filme les coulisses de sa propre écriture.',
   '',
   'draft', NULL, 0, 0,
   NULL, NULL, NULL, NULL, NULL, NULL);

-- Le renvoi d'un avis vers un autre avis du site.
INSERT INTO article_related (article_id, related_id, note, position) VALUES
  ('un-dernier-ete', 'l-annee-de-la-pluie',
   'Même façon de fouiller l''amitié qui vieillit.', 1);

-- ---------------------------------------------------------------------------
-- Un bilan mensuel, ses avis et ses pastilles
-- ---------------------------------------------------------------------------
INSERT INTO bilans (id, year, month, month_label, title, mood, status, published_at, views, likes)
VALUES ('2026-07', 2026, 7, 'Juillet', 'Les longues soirées',
        'Un mois de lumière rasante, où chaque œuvre semblait chercher la sortie du tunnel.',
        'published', '2026-08-02', 3420, 148);

INSERT INTO bilan_avis (bilan_id, article_id, position) VALUES
  ('2026-07', 'un-dernier-ete', 1),
  ('2026-07', 'l-annee-de-la-pluie', 2);

-- Saisies, pas déduites : un mois d'archive garde ses compteurs même quand ses
-- avis ne sont plus détaillés.
INSERT INTO bilan_counts (bilan_id, medium, count) VALUES
  ('2026-07', 'film', 1),
  ('2026-07', 'livre', 1);

-- ---------------------------------------------------------------------------
-- Deux fils de commentaires
-- ---------------------------------------------------------------------------
-- `created_at` est relatif à `now()` plutôt qu'une date figée : c'est ce qui
-- nourrit la carte « Commentaires » du tableau de bord, dont les fenêtres se
-- calculent contre l'heure réelle au moment où la démo tourne.
INSERT INTO comments (id, target_type, target_id, parent_id, author, is_author, body, comment_date, likes, position, created_at)
VALUES
  ('c-article-1', 'article', 'un-dernier-ete', NULL, 'Camille', 0,
   'J''ai vu le film hier soir et je n''arrive toujours pas à en sortir.',
   '2026-07-19', 9, 1, datetime('now', '-6 days')),
  -- La réponse de l'autrice n'est pas datée : l'interface affiche une pastille.
  ('c-article-1-reponse', 'article', 'un-dernier-ete', 'c-article-1', 'Marie-Zoé', 1,
   'Merci Camille — c''est exactement la scène du dîner qui m''a fait écrire cet avis.',
   NULL, 4, 1, datetime('now', '-5 days')),
  ('c-bilan-1', 'bilan', '2026-07', NULL, 'Léa', 0,
   'Ce bilan m''a donné envie de tout rattraper cet été.',
   '2026-08-03', 12, 1, datetime('now', '-2 days'));

-- ---------------------------------------------------------------------------
-- Les pages éditoriales
-- ---------------------------------------------------------------------------
INSERT INTO page_apropos
  (id, eyebrow, greeting, name, intro, portrait_label, bio, bio_emphasis,
   quote, stats_title, follow_title, follow_copy, follow_cta, follow_to)
VALUES
  (1, 'À propos', 'Bonjour, moi c''est', 'Marie-Zoé',
   'J''écris sur ce que je regarde et ce que je lis, une fois que ça a reposé.',
   'Portrait de Marie-Zoé',
   'Je tiens ce carnet depuis quatre ans, sans calendrier et sans obligation.

Chaque fin de mois, je rassemble ce qui a compté dans un bilan.',
   'un bilan
quatre ans',
   '« Un avis n''est jamais qu''une conversation qui commence. »',
   'Cette année',
   'On garde le contact ?',
   'Le bilan du mois arrive dans votre boîte, jamais plus souvent.',
   'Me suivre', '/me-suivre');

INSERT INTO apropos_stats (position, label, value) VALUES
  (1, 'Films & séries', 63),
  (2, 'Livres', 24),
  (3, 'Bilans publiés', 12);

INSERT INTO page_mesuivre
  (id, eyebrow, title, intro, newsletter_eyebrow, newsletter_title,
   newsletter_copy, newsletter_placeholder, newsletter_cta)
VALUES
  (1, 'Me suivre', 'On garde le contact',
   'Choisissez votre endroit préféré — je poste au fil de l''eau, et je résume tout une fois par mois.',
   'La newsletter', 'Le courrier du mois',
   'Le bilan complet, les coups de cœur et une reco rien que pour vous.',
   'votre@email.fr', 'Je m''abonne');

INSERT INTO mesuivre_socials (key, position, name, handle, glyph, url, cta) VALUES
  ('threads',    1, 'Threads',    '@clapetchapitre', 'Th', 'https://threads.net/@clapetchapitre', 'Suivre'),
  ('letterboxd', 2, 'Letterboxd', 'marie-zoe',       'Lb', 'https://letterboxd.com/marie-zoe',    'Voir mes films'),
  ('babelio',    3, 'Babelio',    'marie-zoe',       'Ba', 'https://babelio.com/marie-zoe',       'Voir mes lectures');

-- ---------------------------------------------------------------------------
-- L'audience
-- ---------------------------------------------------------------------------
-- stat_periods ne se sème plus ici : ce n'est pas du contenu, c'est la
-- configuration du sélecteur de période, et la migration 0003 la porte déjà.
--
-- Les vues, les partages et les likes, eux, sont de vrais événements — des
-- centaines par cible sur douze mois — qu'écrire à la main ligne par ligne
-- serait à la fois illisible et faux (aucune ne "compterait" quoi que ce
-- soit de réel). Une CTE récursive les engendre à la place : `day(n)` couvre
-- les 360 derniers jours, et chaque SELECT choisit un sous-ensemble de jours
-- par cible via un modulo, à une heure qui lui est propre pour que les
-- horodatages ne se chevauchent pas exactement.
--
-- Toutes les dates sont relatives à `now()`, pas figées comme celles des
-- avis : c'est ce qui rend la démo vivante quel que soit le jour où elle
-- tourne, et qui exerce réellement /api/admin/dashboard.
WITH RECURSIVE day(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM day WHERE n < 359
)
INSERT INTO view_hits (target_type, target_id, viewed_at)
SELECT 'article', 'un-dernier-ete', datetime('now', '-' || n || ' days', '+3 hours')
  FROM day WHERE n % 2 = 0
UNION ALL
SELECT 'article', 'l-annee-de-la-pluie', datetime('now', '-' || n || ' days', '+9 hours')
  FROM day WHERE n % 3 = 0
UNION ALL
SELECT 'bilan', '2026-07', datetime('now', '-' || n || ' days', '+18 hours')
  FROM day WHERE n % 4 = 0
-- Un mois plus vu que les autres, pour que la courbe ait un vrai pic plutôt
-- qu'un plat : une fenêtre d'un mois, environ quatre mois en arrière.
UNION ALL
SELECT 'article', 'un-dernier-ete', datetime('now', '-' || n || ' days', '+14 hours')
  FROM day WHERE n BETWEEN 95 AND 125;

WITH RECURSIVE day(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM day WHERE n < 359
)
INSERT INTO share_hits (target_type, target_id, channel, created_at)
SELECT 'article', 'un-dernier-ete',
       CASE n % 4 WHEN 0 THEN 'facebook' WHEN 1 THEN 'x' WHEN 2 THEN 'whatsapp' ELSE 'copy' END,
       datetime('now', '-' || n || ' days', '+5 hours')
  FROM day WHERE n % 6 = 0
UNION ALL
SELECT 'article', 'l-annee-de-la-pluie',
       CASE n % 5 WHEN 0 THEN 'facebook' WHEN 1 THEN 'x' WHEN 2 THEN 'whatsapp' WHEN 3 THEN 'email' ELSE 'copy' END,
       datetime('now', '-' || n || ' days', '+11 hours')
  FROM day WHERE n % 9 = 0
UNION ALL
SELECT 'bilan', '2026-07', 'copy', datetime('now', '-' || n || ' days', '+20 hours')
  FROM day WHERE n % 12 = 0;

-- Le ledger des likes, sur le même modèle. `ip_hash` n'a besoin que d'être
-- unique ici — ce n'est jamais une vraie adresse, en démo pas plus qu'en
-- production.
WITH RECURSIVE day(n) AS (
  SELECT 0
  UNION ALL
  SELECT n + 1 FROM day WHERE n < 359
)
INSERT INTO likes (target_type, target_id, ip_hash, created_at)
SELECT 'article', 'un-dernier-ete', 'demo-ete-' || n, datetime('now', '-' || n || ' days', '+8 hours')
  FROM day WHERE n % 3 = 0
UNION ALL
SELECT 'article', 'l-annee-de-la-pluie', 'demo-pluie-' || n, datetime('now', '-' || n || ' days', '+13 hours')
  FROM day WHERE n % 4 = 0
UNION ALL
SELECT 'bilan', '2026-07', 'demo-bilan-' || n, datetime('now', '-' || n || ' days', '+21 hours')
  FROM day WHERE n % 5 = 0;
