/**
 * Who is calling, without keeping a record of who is calling.
 *
 * Two public writes need to tell callers apart — one like per person, a handful
 * of comments per window — and neither needs to know who they are. Hashing the
 * address with a server-side salt gives a stable key that is useless outside
 * this deployment: it cannot be reversed without the salt, and rotating the salt
 * throws the whole mapping away.
 *
 * The salt is why `likes.ip_hash` is not a privacy problem, and why it is not
 * `JWT_SECRET` — see `requireIpSalt`.
 */
import { sha256Hex } from './crypto';

/**
 * The caller's address, or `''` when the platform did not give one.
 *
 * `CF-Connecting-IP` is set by Cloudflare on every request that reaches a
 * Function and cannot be spoofed from outside — unlike `x-forwarded-for`, which
 * a client can send whatever it likes in. The fallback exists for `wrangler
 * pages dev` and the test suite, where the header is absent; it takes the first
 * entry, the only one an intermediary is supposed to have appended last.
 */
function clientIp(request: Request): string {
  const direct = request.headers.get('cf-connecting-ip');
  if (direct) return direct.trim();

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() ?? '';

  return '';
}

/**
 * The salted digest of the caller's address.
 *
 * An unknown address hashes like any other — locally that means every visitor
 * shares one bucket, which makes the rate limit stricter rather than absent.
 * That is the right way round: a missing header must not be a way through.
 */
export async function ipHash(request: Request, salt: string): Promise<string> {
  return sha256Hex(`${salt}:${clientIp(request)}`);
}
