import { describe, it, expect, expectTypeOf } from 'vitest';
import type { Medium, Article, Comment } from '../mock/types';

describe('SC-3 mock types', () => {
  it('Medium and Article are importable and well-shaped', () => {
    const medium: Medium = 'livre';
    const article: Article = {
      id: 'a1',
      title: "L'année de la pluie",
      medium,
      excerpt: 'Un roman dévoré en un week-end.',
      cover: 'linear-gradient(150deg,#7a8c5a,#4f6138)',
      date: '12 juin 2026',
      author: 'Marie-Zoé',
      likes: 28,
      comments: 3,
    };
    expect(article.medium).toBe('livre');
    expectTypeOf<Medium>().toEqualTypeOf<'film' | 'serie' | 'livre' | 'doc'>();
    expectTypeOf<Article['body']>().toEqualTypeOf<string | undefined>();
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
