/**
 * The preamble `send/:bilanId`, `test/:bilanId` and the two announce routes
 * need before they can do anything: the caller is the editor, the route
 * carries its id (`param` names the segment — `bilanId` by default), and the
 * four bindings/secrets a send requires are all configured. Kept out of
 * `_lib/admin.ts` because that gate is generic across every `/api/admin/**`
 * route — this one is specific to the two newsletter-sending routes.
 */
import { requireAdminDb } from './admin';
import { requireNewsletterFrom, requireResendKey, requireUnsubSecret } from './env';
import { misconfigured, notFound } from './http';
import type { D1Database, Env, FunctionContext } from '../types';

export interface NewsletterSendContext {
  /** The route's id segment — a bilan's or an avis', depending on `param`. */
  id: string;
  db: D1Database;
  apiKey: string;
  from: string;
  unsubSecret: string;
}

export async function requireNewsletterSendContext(
  request: Request,
  env: Env,
  params: FunctionContext['params'],
  param: 'bilanId' | 'articleId' = 'bilanId',
): Promise<NewsletterSendContext | Response> {
  const check = await requireAdminDb(request, env);
  if (check instanceof Response) return check;

  const value = params?.[param];
  const id = typeof value === 'string' ? value : '';
  if (!id) return notFound();

  try {
    return {
      id,
      db: check.db,
      apiKey: requireResendKey(env),
      from: requireNewsletterFrom(env),
      unsubSecret: requireUnsubSecret(env),
    };
  } catch {
    return misconfigured();
  }
}