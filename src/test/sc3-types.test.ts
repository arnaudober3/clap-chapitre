import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  Medium,
  Article,
  DraftArticle,
  PublishedArticle,
  Comment,
} from '../../shared/content';

describe('SC-3 mock types', () => {
  it('Medium and Article are importable and well-shaped', () => {
    const medium: Medium = 'livre';
    const article: PublishedArticle = {
      id: 'a1',
      title: "L'année de la pluie",
      medium,
      excerpt: 'Un roman dévoré en un week-end.',
      cover: 'linear-gradient(150deg,#7a8c5a,#4f6138)',
      date: '12 juin 2026',
      author: 'Marie-Zoé',
      likes: 28,
      comments: 3,
      status: 'published',
      views: 420,
      publishedAt: '2026-06-12',
    };
    expect(article.medium).toBe('livre');
    expectTypeOf<Medium>().toEqualTypeOf<'film' | 'serie' | 'livre' | 'doc'>();
    expectTypeOf<Article['body']>().toEqualTypeOf<string | undefined>();
  });

  it('Article is a union discriminated on status', () => {
    // views is required on both members — the public site simply never renders it.
    expectTypeOf<Article>().toEqualTypeOf<DraftArticle | PublishedArticle>();
    expectTypeOf<Article['status']>().toEqualTypeOf<'draft' | 'published'>();
    expectTypeOf<Article['views']>().toEqualTypeOf<number>();
    // Each state carries the field only it can have.
    expectTypeOf<PublishedArticle['publishedAt']>().toEqualTypeOf<string>();
    expectTypeOf<DraftArticle['updatedLabel']>().toEqualTypeOf<string>();

    const draft: Article = {
      id: 'a2',
      title: 'Contre-champs',
      medium: 'doc',
      excerpt: 'Un documentaire en cours d’écriture.',
      cover: 'linear-gradient(150deg,#9a6a8a,#5f3a55)',
      date: '',
      author: 'Marie-Zoé',
      likes: 0,
      comments: 0,
      status: 'draft',
      views: 0,
      updatedLabel: 'Modifié il y a 2 jours',
    };
    // Narrowing on status is what unlocks the state-specific field.
    expect(draft.status === 'draft' && draft.updatedLabel).toBe('Modifié il y a 2 jours');
  });

  it('Comment supports the isAuthor flag and a single nested reply', () => {
    const comment: Comment = {
      id: 'c1',
      author: 'Camille',
      date: '13 juin 2026',
      body: 'Merci pour vos retours !',
      likes: 3,
      reply: {
        id: 'c1-reply',
        author: 'Marie-Zoé',
        // The author's answer is shown undated on purpose — a badge, not a date.
        date: '',
        body: 'Merci Camille !',
        isAuthor: true,
        likes: 1,
      },
    };
    expect(comment.reply?.isAuthor).toBe(true);
    expectTypeOf<Comment['isAuthor']>().toEqualTypeOf<boolean | undefined>();
    // A reply is a Comment, so the shape stops recursing only because no design
    // nests a second level — the type would allow it.
    expectTypeOf<Comment['reply']>().toEqualTypeOf<Comment | undefined>();
  });
});
