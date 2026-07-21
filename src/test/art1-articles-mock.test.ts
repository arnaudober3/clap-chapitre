import { describe, it, expect } from 'vitest';
import type { Article } from '../mock/types';
import { feed } from '../mock/home';
import { bilans } from '../mock/bilans';
import {
  articles,
  articleById,
  articleNeighbours,
  relatedArticles,
  bilanForArticle,
} from '../mock/articles';

const bilanAvis = bilans.flatMap((bilan) => bilan.avis);

describe('ART-1 articles union', () => {
  it('has unique ids, opens with the home feed in order and contains every bilan avis', () => {
    const ids = articles.map((article) => article.id);
    expect(new Set(ids).size).toBe(ids.length);

    feed.forEach((item, index) => {
      expect(articles[index].id).toBe(item.id);
    });

    for (const avis of bilanAvis) {
      expect(ids).toContain(avis.id);
    }
  });
});

describe('ART-1 articleById', () => {
  it('returns the enriched "un dernier été" avis', () => {
    const article = articleById('un-dernier-ete');
    expect(article).toBeDefined();
    expect(article!.genreMeta).toBe('Comédie dramatique · 2 h 04 · 2026');
    expect(article!.readingTime).toBe('4 min de lecture');
    expect(article!.pullQuote).toBeTruthy();
    const paragraphs = (article!.body ?? '').split('\n\n');
    expect(paragraphs.length).toBeGreaterThanOrEqual(4);
    expect(article!.related).toHaveLength(2);
  });

  it('returns undefined for an unknown id and for an empty id', () => {
    expect(articleById('nope-nope')).toBeUndefined();
    expect(articleById('')).toBeUndefined();
  });
});

describe('ART-1 articleNeighbours', () => {
  it('returns the adjacent articles for a middle id', () => {
    const middleIndex = 2;
    const middle = articles[middleIndex];
    const { prev, next } = articleNeighbours(middle.id);
    expect(prev).toBe(articles[middleIndex - 1]);
    expect(next).toBe(articles[middleIndex + 1]);
    expect(prev).not.toBe(middle);
    expect(next).not.toBe(middle);
  });

  it('omits prev on the first article and next on the last', () => {
    const first = articleNeighbours(articles[0].id);
    expect(first.prev).toBeUndefined();
    expect(first.next).toBe(articles[1]);

    const last = articleNeighbours(articles[articles.length - 1].id);
    expect(last.next).toBeUndefined();
    expect(last.prev).toBe(articles[articles.length - 2]);
  });

  it('returns neither neighbour for an unknown id', () => {
    expect(articleNeighbours('nope-nope')).toEqual({});
  });
});

describe('ART-1 relatedArticles', () => {
  it('resolves the two related avis of "un dernier été" with their notes', () => {
    const article = articleById('un-dernier-ete')!;
    const related = relatedArticles(article);
    expect(related.map((item) => item.id)).toEqual([
      'l-annee-de-la-pluie',
      'les-nuits-blanches',
    ]);
    expect(related[0].note).toBe(article.related![0].note);
    expect(related[1].note).toBe(article.related![1].note);
    expect(related[0].title).toBe(articleById('l-annee-de-la-pluie')!.title);
  });

  it('drops a repeated id rather than resolving it twice', () => {
    const twice = relatedArticles({
      ...articleById('un-dernier-ete')!,
      related: [
        { id: 'l-annee-de-la-pluie', note: 'une fois' },
        { id: 'l-annee-de-la-pluie', note: 'deux fois' },
      ],
    });
    expect(twice).toHaveLength(1);
    expect(twice[0].note).toBe('une fois');
  });

  it('drops only the unknown ids and returns [] when there is no related', () => {
    const withUnknown: Article = {
      ...articleById('un-dernier-ete')!,
      related: [
        { id: 'ceci-nexiste-pas', note: 'jamais rendu' },
        { id: 'les-nuits-blanches', note: 'rendu' },
      ],
    };
    const resolved = relatedArticles(withUnknown);
    expect(resolved).toHaveLength(1);
    expect(resolved[0].id).toBe('les-nuits-blanches');

    const withoutRelated: Article = {
      ...articleById('un-dernier-ete')!,
      related: undefined,
    };
    expect(relatedArticles(withoutRelated)).toEqual([]);
  });
});

describe('ART-1 bilanForArticle', () => {
  it('returns the owning bilan for a bilan avis and undefined for a feed-only avis', () => {
    const owner = bilans[0];
    const avis = owner.avis[0];
    expect(bilanForArticle(avis.id)).toBe(owner);
    expect(bilanForArticle('un-dernier-ete')).toBeUndefined();
    expect(bilanForArticle('nope-nope')).toBeUndefined();
  });
});
