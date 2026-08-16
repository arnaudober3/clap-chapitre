/**
 * A sliding window, kept in D1.
 *
 * The runtime is stateless and cannot count anything between requests — which is
 * why `/api/login` settles for a delay and leaves the real limiting to a WAF
 * rule. The database, however, remembers. One row per attempt, a COUNT over the
 * window, and a purge of everything older, all in one batch.
 *
 * A WAF rule is still better at absorbing a flood: it answers at the edge, this
 * costs two queries. What it cannot do is run under vitest or on a laptop, and a
 * limit nobody can exercise is a limit nobody knows is broken.
 */
import { changes } from './write';
import type { D1Database } from '../types';

export interface Window {
  /** How many writes are allowed inside the window. */
  max: number;
  /** The window's width, in minutes. */
  minutes: number;
}

/** Comments: five per quarter of an hour. Enough to answer a thread, not to flood one. */
export const COMMENT_WINDOW: Window = { max: 5, minutes: 15 };

/**
 * Shares: twenty per quarter of an hour. A legitimate reader can hit every
 * channel on several avis in a row; this is here to stop a script, not a fan.
 */
export const SHARE_WINDOW: Window = { max: 20, minutes: 15 };

/**
 * Newsletter subscriptions: ten per quarter of an hour. Looser than comments
 * (one write per person, not a conversation), tighter than shares (a script
 * hammering the form should still be capped).
 */
export const NEWSLETTER_SUBSCRIBE_WINDOW: Window = { max: 10, minutes: 15 };

/**
 * Records a hit and says whether it was allowed.
 *
 * The count runs *before* the insert, so the caller's own hit does not count
 * against them — `max: 5` means five accepted writes, not four. A refused hit is
 * still recorded: someone hammering the endpoint should stay refused for the
 * full window rather than serving their own sentence one request at a time.
 *
 * The purge is opportunistic and unconditional. There is no cron here, and rows
 * outside every window are unreadable weight; deleting them on the way past
 * keeps the table proportional to live traffic instead of to all traffic ever.
 */
export async function allow(
  db: D1Database,
  bucket: string,
  ipHash: string,
  window: Window,
): Promise<boolean> {
  const [recent] = await db.batch<{ hits: number }>([
    db
      .prepare(
        `SELECT count(*) AS hits FROM rate_hits
          WHERE bucket = ? AND ip_hash = ?
            AND hit_at > datetime('now', ?)`,
      )
      .bind(bucket, ipHash, `-${window.minutes} minutes`),
    db
      .prepare(`INSERT INTO rate_hits (bucket, ip_hash, hit_at) VALUES (?, ?, datetime('now'))`)
      .bind(bucket, ipHash),
    db
      .prepare(`DELETE FROM rate_hits WHERE bucket = ? AND hit_at <= datetime('now', ?)`)
      .bind(bucket, `-${window.minutes} minutes`),
  ]);

  const hits = recent?.results[0]?.hits ?? 0;
  return hits < window.max;
}

// Re-exported so a handler that needs both reads one import; `changes` lives in
// write.ts because every write path needs it, not just this one.
export { changes };
