/**
 * A real SQLite database, satisfying the `D1Database` interface.
 *
 * The suite has no Miniflare, and CLAUDE.md said real SQL would wait for real
 * tables. There are real tables now, and the alternative — a fake `prepare()`
 * that hands back canned rows — would have to recognise queries by their text:
 * every join, every ORDER BY and every LIMIT would be asserted against a script
 * rather than executed, and rewording a query would break twenty page tests for
 * no reason.
 *
 * So this runs the actual statements, against the actual schema, read straight
 * from `migrations/`. What the handlers do under vitest is what they do in
 * production, minus the network — which is the same bargain `api-server.ts`
 * already strikes for the auth endpoints.
 *
 * `node:sqlite` is used rather than a dependency: it ships with the Node the
 * project already requires. It prints an experimental warning on first use;
 * `better-sqlite3` would be the swap if that ever becomes a problem.
 */
import { createRequire } from 'node:module';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { D1Database, D1PreparedStatement, D1Result } from '../../functions/types';

/** The slice of `node:sqlite` used here — see the note on the require below. */
interface SqliteStatement {
  get(...values: never[]): unknown;
  all(...values: never[]): unknown[];
  /** `changes` is what D1 reports as `meta.changes` — a DELETE that hit nothing is a 404. */
  run(...values: never[]): { changes: number | bigint; lastInsertRowid: number | bigint };
}
interface SqliteDatabase {
  exec(sql: string): void;
  prepare(sql: string): SqliteStatement;
  close(): void;
}

/**
 * Required, not imported: `node:sqlite` postdates Vite's list of Node builtins,
 * so a static import is rewritten into a package lookup that fails. Going
 * through `createRequire` keeps it out of the transform entirely.
 */
const { DatabaseSync } = createRequire(import.meta.url)('node:sqlite') as {
  new (path: string): SqliteDatabase;
  DatabaseSync: new (path: string) => SqliteDatabase;
};

const MIGRATIONS = join(process.cwd(), 'migrations');

/**
 * Every migration, in filename order — the same order wrangler applies them in,
 * which the `NNNN_` prefix is there to guarantee.
 */
function schema(): string {
  return readdirSync(MIGRATIONS)
    .filter((name) => name.endsWith('.sql'))
    .sort()
    .map((name) => readFileSync(join(MIGRATIONS, name), 'utf8'))
    .join('\n');
}

/**
 * D1 hands back plain objects; `node:sqlite` returns null-prototype ones, which
 * `expect().toEqual()` reports as different from an object literal even when
 * every key matches. Copying is cheaper than explaining that in five tests.
 */
function plain(row: unknown): Record<string, unknown> {
  return { ...(row as Record<string, unknown>) };
}

function result<T>(rows: unknown[], meta: Record<string, unknown> = {}): D1Result<T> {
  return { results: rows.map(plain) as T[], success: true, meta };
}

/**
 * An in-memory database with the project's schema applied.
 *
 * Foreign keys are enabled, as they are on D1: a test that inserts a comment for
 * an article that does not exist should fail in the test, not in production.
 */
export function createTestDb(): D1Database & { close(): void; exec(sql: string): Promise<{ count: number; duration: number }> } {
  const db = new DatabaseSync(':memory:');
  db.exec('PRAGMA foreign_keys = ON');
  db.exec(schema());

  /** Serialises `batch()` — see the note there. */
  let queue: Promise<void> = Promise.resolve();

  const prepare = (query: string): D1PreparedStatement => {
    const bind = (values: unknown[]): D1PreparedStatement => ({
      bind: (...next: unknown[]) => bind([...values, ...next]),
      first: async <T,>() => {
        const row = db.prepare(query).get(...(values as never[]));
        return row === undefined ? null : (plain(row) as T);
      },
      run: async <T,>() => {
        const info = db.prepare(query).run(...(values as never[]));
        return result<T>([], { changes: Number(info.changes) });
      },
      // `all` covers reads and writes alike, because `batch` funnels everything
      // through it — hence the `changes` here too, which is what a DELETE inside
      // a batch reports back.
      all: async <T,>() => {
        const statement = db.prepare(query);
        if (/^\s*(INSERT|UPDATE|DELETE|REPLACE)/i.test(query)) {
          const info = statement.run(...(values as never[]));
          return result<T>([], { changes: Number(info.changes) });
        }
        return result<T>(statement.all(...(values as never[])));
      },
    });
    return bind([]);
  };

  return {
    prepare,
    /**
     * D1 runs a batch in one implicit transaction, and that is load-bearing now
     * that the suite writes: a reorder deletes a selection before reinserting
     * it, so a failure halfway through must leave the old selection intact
     * rather than an empty one. Running the statements sequentially without a
     * transaction — as this did while everything was read-only — would let such
     * a test pass while hiding the bug.
     *
     * Queued, because SQLite has no nested transactions and a page routinely
     * has two requests in flight at once: the bilan page asks for the month and
     * the month list together, both of which batch. Without the queue the second
     * `BEGIN` lands inside the first and throws, which surfaced as a page that
     * simply failed to load. D1 serialises a batch the same way — the queue is
     * fidelity, not a workaround.
     */
    batch: async <T,>(statements: D1PreparedStatement[]) => {
      const run = queue.then(async () => {
        db.exec('BEGIN');
        try {
          const results: D1Result<T>[] = [];
          // Sequential, not `Promise.all`: the statements share one connection
          // and one transaction, and several read what the previous just wrote.
          for (const statement of statements) results.push(await statement.all<T>());
          db.exec('COMMIT');
          return results;
        } catch (error) {
          db.exec('ROLLBACK');
          throw error;
        }
      });
      // The chain must not break on a failed batch, or every later one inherits
      // the rejection.
      queue = run.then(
        () => undefined,
        () => undefined,
      );
      return run;
    },
    exec: async (sql: string) => {
      db.exec(sql);
      return { count: 0, duration: 0 };
    },
    close: () => db.close(),
  };
}

/** Run raw SQL — how a test inserts its fixtures. */
export function seed(db: D1Database, sql: string): Promise<{ count: number; duration: number }> {
  return db.exec(sql);
}
