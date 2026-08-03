/**
 * POST /api/verify — Authorization: Bearer <token> → 200 { username } | 401
 *
 * The authority on whether a session is real. The client decodes tokens for a
 * first-render guess (`src/auth/token.ts`); only a server-side check looks at a
 * signature.
 *
 * The checking itself lives in `_lib/admin.ts`, shared with every `/api/admin/**`
 * route: this endpoint and those routes must agree on what a valid session is,
 * and the only way to guarantee that is for them to run the same code.
 */
import { requireAdmin } from '../_lib/admin';
import { json, postOnly } from '../_lib/http';
import type { Handler } from '../types';

export const onRequestPost: Handler = async ({ request, env }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;
  return json({ username: check.username });
};

export const onRequest = postOnly(onRequestPost);
