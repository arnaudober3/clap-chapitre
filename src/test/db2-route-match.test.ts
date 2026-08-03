/**
 * The file-routing rule shared by the dev server and the test stub.
 *
 * It is worth its own test because a mistake here does not surface as a failing
 * assertion anywhere else: an unmatched path falls through to Vite's SPA
 * fallback, and the endpoint answers `index.html` with a 200. That reads like a
 * broken handler, not like a missing route.
 */
import { describe, expect, it } from 'vitest';
import { matchRoute, type RoutePattern } from '../../vite/routeMatch';

const ROUTES: ReadonlyArray<RoutePattern<string>> = [
  { pattern: '/api/bilans', target: 'collection' },
  { pattern: '/api/bilans/:id', target: 'item' },
  { pattern: '/api/admin/articles/:id', target: 'admin-item' },
];

describe('matchRoute', () => {
  it('matches a static path and reports no params', () => {
    expect(matchRoute('/api/bilans', ROUTES)).toEqual({
      target: 'collection',
      params: {},
    });
  });

  it('captures a dynamic segment', () => {
    expect(matchRoute('/api/bilans/2026-06', ROUTES)).toEqual({
      target: 'item',
      params: { id: '2026-06' },
    });
  });

  it('keeps the collection and the item apart on segment count', () => {
    // The nesting is what makes this worth asserting: /api/admin/articles/:id
    // must not swallow /api/bilans/:id, and neither may answer the other's path.
    expect(matchRoute('/api/admin/articles/un-dernier-ete', ROUTES)?.target).toBe('admin-item');
    expect(matchRoute('/api/bilans/2026-06/avis', ROUTES)).toBeUndefined();
  });

  it('treats a trailing slash as the collection, not an empty id', () => {
    expect(matchRoute('/api/bilans/', ROUTES)?.target).toBe('collection');
  });

  it('decodes a percent-encoded segment', () => {
    expect(matchRoute('/api/bilans/a%20b', ROUTES)?.params.id).toBe('a b');
  });

  it('returns undefined for an unknown path rather than guessing', () => {
    expect(matchRoute('/api/inconnu', ROUTES)).toBeUndefined();
    expect(matchRoute('/', ROUTES)).toBeUndefined();
  });
});
