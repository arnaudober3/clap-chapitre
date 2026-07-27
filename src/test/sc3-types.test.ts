import { describe, it, expect, expectTypeOf } from 'vitest';
import type {
  Medium,
  Article,
  DraftArticle,
  PublishedArticle,
  Comment,
} from '../mock/types';

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

  it('Comment supports the isAuthor flag', () => {
    const comment: Comment = {
      id: 'c1',
      author: 'Marie-Zoé',
      date: '13 juin 2026',
      body: 'Merci pour vos retours !',
      isAuthor: true,
    };
    expect(comment.isAuthor).toBe(true);
    expectTypeOf<Comment['isAuthor']>().toEqualTypeOf<boolean | undefined>();
  });
});
