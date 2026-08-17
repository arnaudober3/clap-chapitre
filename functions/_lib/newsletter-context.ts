/**
 * The preamble `send/:bilanId` and `test/:bilanId` both need before they can do
 * anything: the caller is the editor, the route carries a `bilanId`, and the
 * four bindings/secrets a send requires are all configured. Kept out of
 * `_lib/admin.ts` because that gate is generic across every `/api/admin/**`
 * route — this one is specific to the two newsletter-sending routes.
 */
import { requireAdminDb } from './admin';
import { requireNewsletterFrom, requireResendKey, requireUnsubSecret } from './env';
import { misconfigured, notFound } from './http';
import type { D1Database, Env, FunctionContext } from '../types';

export interface NewsletterSendContext {
  bilanId: string;
  db: D1Database;
  apiKey: string;
  from: string;
  unsubSecret: string;
}

export async function requireNewsletterSendContext(
  request: Request,
  env: Env,
  params: FunctionContext['params'],
): Promise<NewsletterSendContext | Response> {
  const check = await requireAdminDb(request, env);
  if (check instanceof Response) return check;

  const bilanId = typeof params?.bilanId === 'string' ? params.bilanId : '';
  if (!bilanId) return notFound();

  try {
    return {
      bilanId,
      db: check.db,
      apiKey: requireResendKey(env),
      from: requireNewsletterFrom(env),
      unsubSecret: requireUnsubSecret(env),
    };
  } catch {
    return misconfigured();
  }
}