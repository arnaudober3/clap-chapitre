/**
 * The content the tests work with, in the two forms they need it.
 *
 * `anArticle()` and friends build objects for the components that render props.
 * `SEED` is the SQL equivalent for the tests that go through a handler — same
 * three avis, same month, so an assertion reads the same either way.
 *
 * Small on purpose: three avis, one bilan, one thread. A fixture set large
 * enough to be interesting is a fixture set nobody can hold in their head while
 * reading a failure.
 */
import type { Comment, DraftArticle, PublishedArticle, PublishedBilan } from '../../shared/content';
import type { BilanSummary } from '../api/content';
import type { AProposContent } from '../content/apropos';
import type { MeSuivreContent } from '../content/mesuivre';

/** A published avis. Override whatever the test is actually about. */
export function anArticle(over: Partial<PublishedArticle> = {}): PublishedArticle {
  return {
    id: 'un-dernier-ete',
    title: 'Un dernier été',
    medium: 'film',
    excerpt: 'Un huis clos solaire où chaque silence pèse plus lourd que les mots.',
    cover: '',
    date: '18 juillet 2026',
    author: 'Marie-Zoé',
    likes: 128,
    comments: 24,
    views: 2180,
    status: 'published',
    publishedAt: '2026-07-18',
    hook: 'Et si le dernier été n’était jamais vraiment le dernier ?',
    forThoseWho: 'Pour ceux qui aiment les fins qui laissent la fenêtre entrouverte.',
    genreMeta: 'Comédie dramatique · 2 h 04 · 2026',
    readingTime: '4 min de lecture',
    body: 'Il y a des films qui ressemblent à une maison.\n\nOn en ressort avec du sable dans les poches.',
    pullQuote: 'Rien n’explose : tout se déplace d’un millimètre.',
    ...over,
  };
}

/** An avis still being written: no publication date, no figures. */
export function aDraft(over: Partial<DraftArticle> = {}): DraftArticle {
  return {
    id: 'contre-champs',
    title: 'Contre-champs',
    medium: 'serie',
    excerpt: 'Notes en cours.',
    cover: '',
    date: '',
    author: 'Marie-Zoé',
    likes: 0,
    comments: 0,
    views: 0,
    status: 'draft',
    updatedLabel: 'Modifié il y a 2 jours',
    ...over,
  };
}

export function aBilan(over: Partial<PublishedBilan> = {}): PublishedBilan {
  return {
    id: '2026-07',
    year: 2026,
    month: 7,
    monthLabel: 'Juillet',
    title: 'Les longues soirées',
    mood: 'Un mois de lumière rasante.',
    avis: [anArticle()],
    counts: { film: 1, livre: 1 },
    views: 3420,
    likes: 148,
    status: 'published',
    publishedAt: '2026-08-02',
    ...over,
  };
}

/** A month as the listings show it, without its avis. */
export function aBilanSummary(over: Partial<BilanSummary> = {}): BilanSummary {
  return {
    ...aBilan(),
    avis: [],
    avisCount: 2,
    covers: [''],
    ...over,
  };
}

/** A thread entry with the author's undated reply under it. */
export function aComment(over: Partial<Comment> = {}): Comment {
  return {
    id: 'c-article-1',
    author: 'Camille',
    date: '19 juillet 2026',
    body: 'J’ai vu le film hier soir et je n’arrive toujours pas à en sortir.',
    likes: 9,
    reply: {
      id: 'c-article-1-reponse',
      author: 'Marie-Zoé',
      // Undated on purpose: the author's answers wear a badge instead.
      date: '',
      body: 'Merci Camille.',
      isAuthor: true,
      likes: 4,
    },
    ...over,
  };
}

/**
 * The "À propos" page content, matching the rows in `SEED` so an assertion reads
 * the same whether the test renders a component or goes through the endpoint.
 */
export function anApropos(over: Partial<AProposContent> = {}): AProposContent {
  return {
    eyebrow: 'À propos',
    greeting: 'Bonjour, moi c’est',
    name: 'Marie-Zoé',
    intro: 'J’écris sur ce que je regarde.',
    portraitLabel: 'Portrait de Marie-Zoé',
    // No portrait uploaded — which is what an empty database looks like, and
    // what the page's neutral placeholder is for.
    portraitImage: '',
    bio: [
      'Je tiens ce carnet depuis quatre ans.',
      'Chaque fin de mois, je rassemble ce qui a compté dans un bilan.',
    ],
    bioEmphasis: ['un bilan'],
    quote: '« Un avis n’est jamais qu’une conversation. »',
    statsTitle: 'Cette année',
    stats: [
      { label: 'Films & séries', value: 63 },
      { label: 'Livres', value: 24 },
    ],
    follow: {
      title: 'On garde le contact ?',
      copy: 'Le bilan du mois arrive dans votre boîte.',
      cta: 'Me suivre →',
      to: '/me-suivre',
    },
    ...over,
  };
}

/** The "Me suivre" page content, likewise matching `SEED`. */
export function aMeSuivre(over: Partial<MeSuivreContent> = {}): MeSuivreContent {
  return {
    eyebrow: 'Me suivre',
    title: 'On garde le contact',
    intro:
      'Choisissez votre endroit préféré — je poste au fil de l’eau sur les réseaux, et je résume tout une fois par mois dans la newsletter.',
    newsletter: {
      eyebrow: 'La newsletter',
      title: 'Le courrier du mois',
      copy: 'Le bilan complet, les coups de cœur et une reco rien que pour vous.',
      placeholder: 'votre@email.fr',
      cta: 'S’abonner',
    },
    // The four networks of design 3c. Their URLs are absolute https:, never '#',
    // and they carry the scheme and the www. the editor's form strips for display.
    socials: [
      {
        key: 'threads',
        name: 'Threads',
        handle: '@mariezoe · réactions à chaud',
        glyph: '@',
        url: 'https://www.threads.net/@mariezoe',
        cta: 'Suivre',
      },
      {
        key: 'letterboxd',
        name: 'Letterboxd',
        handle: '@mariezoe · tous mes films',
        glyph: '▶',
        url: 'https://letterboxd.com/mariezoe/',
        cta: 'Suivre',
      },
      {
        key: 'babelio',
        name: 'Babelio',
        handle: '@mariezoe · ma bibliothèque',
        glyph: 'B',
        url: 'https://www.babelio.com/monprofil.php',
        cta: 'Suivre',
      },
      {
        key: 'linkedin',
        name: 'LinkedIn',
        handle: 'Marie-Zoé · le côté pro',
        glyph: 'in',
        url: 'https://www.linkedin.com/in/mariezoe/',
        cta: 'Suivre',
      },
    ],
    ...over,
  };
}

/**
 * The same content as rows, for the tests that run through a handler.
 *
 * Kept in sync with the builders above by hand, and by the fact that both are
 * read side by side in the page tests: a title that disagrees shows up in the
 * first assertion that renders it.
 */
export const SEED = `
INSERT INTO articles (id,title,medium,excerpt,cover,author,status,published_at,likes,views,hook,for_those_who,genre_meta,reading_time,body,pull_quote)
VALUES
 ('un-dernier-ete','Un dernier été','film','Un huis clos solaire où chaque silence pèse plus lourd que les mots.','','Marie-Zoé','published','2026-07-18',128,2180,
  'Et si le dernier été n’était jamais vraiment le dernier ?','Pour ceux qui aiment les fins qui laissent la fenêtre entrouverte.','Comédie dramatique · 2 h 04 · 2026','4 min de lecture',
  'Il y a des films qui ressemblent à une maison.

On en ressort avec du sable dans les poches.','Rien n’explose : tout se déplace d’un millimètre.'),
 ('l-annee-de-la-pluie','L’année de la pluie','livre','Une chronique d’amitié qui vieillit.','','Marie-Zoé','published','2026-07-04',74,1210,
  'Peut-on relire une amitié ?','Pour ceux qui gardent les lettres.','Roman · 264 pages · 2026','5 min de lecture','Le livre avance au rythme des averses.',NULL),
 ('contre-champs','Contre-champs','serie','Notes en cours.','','Marie-Zoé','draft',NULL,0,0,NULL,NULL,NULL,NULL,NULL,NULL);

INSERT INTO article_related (article_id,related_id,note,position)
VALUES ('un-dernier-ete','l-annee-de-la-pluie','Même façon de fouiller l’amitié qui vieillit.',1);

INSERT INTO bilans (id,year,month,month_label,title,mood,status,published_at,views,likes)
VALUES ('2026-07',2026,7,'Juillet','Les longues soirées','Un mois de lumière rasante.','published','2026-08-02',3420,148);

INSERT INTO bilan_avis (bilan_id,article_id,position) VALUES ('2026-07','un-dernier-ete',1),('2026-07','l-annee-de-la-pluie',2);
INSERT INTO bilan_counts (bilan_id,medium,count) VALUES ('2026-07','film',1),('2026-07','livre',1);

INSERT INTO comments (id,target_type,target_id,parent_id,author,is_author,body,comment_date,likes,position)
VALUES
 ('c-article-1','article','un-dernier-ete',NULL,'Camille',0,'J’ai vu le film hier soir et je n’arrive toujours pas à en sortir.','2026-07-19',9,1),
 ('c-article-1-reponse','article','un-dernier-ete','c-article-1','Marie-Zoé',1,'Merci Camille.',NULL,4,1),
 ('c-bilan-1','bilan','2026-07',NULL,'Léa',0,'Ce bilan m’a donné envie de tout rattraper.','2026-08-03',12,1);

INSERT INTO page_apropos (id,eyebrow,greeting,name,intro,portrait_label,bio,bio_emphasis,quote,stats_title,follow_title,follow_copy,follow_cta,follow_to)
VALUES (1,'À propos','Bonjour, moi c’est','Marie-Zoé','J’écris sur ce que je regarde.','Portrait de Marie-Zoé',
 'Je tiens ce carnet depuis quatre ans.

Chaque fin de mois, je rassemble ce qui a compté dans un bilan.','un bilan','« Un avis n’est jamais qu’une conversation. »','Cette année','On garde le contact ?','Le bilan du mois arrive dans votre boîte.','Me suivre →','/me-suivre');

INSERT INTO apropos_stats (position,label,value) VALUES (1,'Films & séries',63),(2,'Livres',24);

INSERT INTO page_mesuivre (id,eyebrow,title,intro,newsletter_eyebrow,newsletter_title,newsletter_copy,newsletter_placeholder,newsletter_cta)
VALUES (1,'Me suivre','On garde le contact','Choisissez votre endroit préféré — je poste au fil de l’eau sur les réseaux, et je résume tout une fois par mois dans la newsletter.','La newsletter','Le courrier du mois','Le bilan complet, les coups de cœur et une reco rien que pour vous.','votre@email.fr','S’abonner');

INSERT INTO mesuivre_socials (key,position,name,handle,glyph,url,cta)
VALUES ('threads',1,'Threads','@mariezoe · réactions à chaud','@','https://www.threads.net/@mariezoe','Suivre'),
       ('letterboxd',2,'Letterboxd','@mariezoe · tous mes films','▶','https://letterboxd.com/mariezoe/','Suivre'),
       ('babelio',3,'Babelio','@mariezoe · ma bibliothèque','B','https://www.babelio.com/monprofil.php','Suivre'),
       ('linkedin',4,'LinkedIn','Marie-Zoé · le côté pro','in','https://www.linkedin.com/in/mariezoe/','Suivre');

INSERT INTO stat_periods (id,label,position,is_default) VALUES ('7j','7 derniers jours',1,0),('30j','30 derniers jours',2,1);
INSERT INTO stat_kpis (period_id,key,label,value,delta_pct,position) VALUES
 ('30j','views','Vues',8940,18,1),('30j','likes','Likes',314,9,2),
 ('7j','views','Vues',2180,6,1),('7j','likes','Likes',74,-4,2);
INSERT INTO stat_trend (position,month_label,views) VALUES (1,'juil',8100),(2,'août',8940);
`;
