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
INSERT INTO comments (id, target_type, target_id, parent_id, author, is_author, body, comment_date, likes, position)
VALUES
  ('c-article-1', 'article', 'un-dernier-ete', NULL, 'Camille', 0,
   'J''ai vu le film hier soir et je n''arrive toujours pas à en sortir.',
   '2026-07-19', 9, 1),
  -- La réponse de l'autrice n'est pas datée : l'interface affiche une pastille.
  ('c-article-1-reponse', 'article', 'un-dernier-ete', 'c-article-1', 'Marie-Zoé', 1,
   'Merci Camille — c''est exactement la scène du dîner qui m''a fait écrire cet avis.',
   NULL, 4, 1),
  ('c-bilan-1', 'bilan', '2026-07', NULL, 'Léa', 0,
   'Ce bilan m''a donné envie de tout rattraper cet été.',
   '2026-08-03', 12, 1);

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
-- Les statistiques du tableau de bord
-- ---------------------------------------------------------------------------
INSERT INTO stat_periods (id, label, position, is_default) VALUES
  ('7j',  '7 derniers jours',   1, 0),
  ('30j', '30 derniers jours',  2, 1),
  ('12m', '12 derniers mois',   3, 0);

INSERT INTO stat_kpis (period_id, key, label, value, delta_pct, position) VALUES
  ('7j',  'views',    'Vues',          2180,  6, 1),
  ('7j',  'likes',    'Likes',           74, -4, 2),
  ('7j',  'comments', 'Commentaires',    11,  3, 3),
  ('7j',  'shares',   'Partages',        24,  8, 4),
  ('30j', 'views',    'Vues',          8940, 18, 1),
  ('30j', 'likes',    'Likes',          314,  9, 2),
  ('30j', 'comments', 'Commentaires',    46, 12, 3),
  ('30j', 'shares',   'Partages',       105, 23, 4),
  ('12m', 'views',    'Vues',         76400, 41, 1),
  ('12m', 'likes',    'Likes',         2680, 27, 2),
  ('12m', 'comments', 'Commentaires',   392, -6, 3),
  ('12m', 'shares',   'Partages',       910, 34, 4);

INSERT INTO stat_trend (position, month_label, views) VALUES
  (1, 'sep', 4200), (2,  'oct', 4600), (3,  'nov', 4400), (4,  'déc', 5200),
  (5, 'jan', 5600), (6,  'fév', 5300), (7,  'mar', 6200), (8,  'avr', 5900),
  (9, 'mai', 6800), (10, 'juin', 7200), (11, 'juil', 8100), (12, 'août', 8940);
