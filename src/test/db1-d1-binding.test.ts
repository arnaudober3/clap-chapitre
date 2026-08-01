/**
 * The D1 binding, asserted at the only level the unit suite can reach: the
 * Function called directly, no fetch, no DOM.
 *
 * There is no Miniflare here, so the "database" below is a hand-built object
 * satisfying the slice of D1 the handler uses. That is deliberate and limited —
 * it proves the wiring and the failure modes, not SQL behaviour. When real
 * tables arrive, the queries themselves belong in a Miniflare-backed suite.
 */
import { describe, it, expect } from 'vitest';
import { onRequest as dbHealth, onRequestGet } from '../../functions/api/db-health';
import { requireDb } from '../../functions/_lib/env';
import type { D1Database, D1PreparedStatement } from '../../functions/types';
import { TEST_ENV } from './api-server';

/** A D1 whose single statement resolves to `row`, or rejects if given an error. */
function fakeDb(row: Record<string, unknown> | null | Error): D1Database {
  const statement = {
    bind: () => statement,
    first: async () => {
      if (row instanceof Error) throw row;
      return row;
    },
    run: async () => ({ results: [], success: true, meta: {} }),
    all: async () => ({ results: [], success: true, meta: {} }),
  } as unknown as D1PreparedStatement;

  return {
    prepare: () => statement,
    batch: async () => [],
    exec: async () => ({ count: 0, duration: 0 }),
  };
}

function get(url = 'http://localhost/api/db-health') {
  return new Request(url);
}

describe('DB-1 requireDb', () => {
  it('throws when the binding is missing', () => {
    expect(() => requireDb(TEST_ENV)).toThrow(/DB/);
    expect(() => requireDb(undefined)).toThrow(/DB/);
  });

  it('throws when the binding is not a D1 database', () => {
    expect(() => requireDb({ DB: {} as D1Database })).toThrow(/DB/);
  });

  it('returns the binding when it is there', () => {
    const db = fakeDb({ id: 1 });
    expect(requireDb({ DB: db })).toBe(db);
  });
});

describe('DB-1 GET /api/db-health', () => {
  it('answers 500 when the deployment has no binding', async () => {
    const response = await onRequestGet({ request: get(), env: TEST_ENV });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: 'Configuration du serveur incomplète.',
    });
  });

  it('answers 200 when the probe row is there', async () => {
    const response = await onRequestGet({
      request: get(),
      env: { ...TEST_ENV, DB: fakeDb({ id: 1 }) },
    });
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(await response.json()).toEqual({ ok: true });
  });

  it('answers 503 when the database is reachable but unmigrated', async () => {
    const response = await onRequestGet({
      request: get(),
      env: { ...TEST_ENV, DB: fakeDb(null) },
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Migrations non appliquées.' });
  });

  it('answers 503 — and leaks no SQL — when the query fails', async () => {
    const response = await onRequestGet({
      request: get(),
      env: { ...TEST_ENV, DB: fakeDb(new Error('no such table: schema_health')) },
    });
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: 'Base de données indisponible.' });
  });

  it('rejects anything but GET', async () => {
    const response = await dbHealth({
      request: new Request('http://localhost/api/db-health', { method: 'POST' }),
      env: { ...TEST_ENV, DB: fakeDb({ id: 1 }) },
    });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET');
  });
});
