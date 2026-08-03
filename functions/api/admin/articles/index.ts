/**
 * GET  /api/admin/articles → 200 { items, total, page, perPage, catalogue }
 * POST /api/admin/articles → 201 { id }
 *
 * The back-office avis listing: every avis, drafts included, with the filters
 * and sorts the toolbar offers. Behind the admin JWT — this is the endpoint that
 * hands out view counts and unpublished work.
 *
 * Two counts, and they are not the same thing:
 *   * `total` counts what the current filter matches, and drives the pager.
 *   * `catalogue` counts the whole catalogue, and drives the "32 avis · 2
 *     brouillons" line, which must not move when the editor types in the search
 *     box.
 *
 * Drafts sort first whatever the sort: what is being written belongs above what
 * is already online, and sorting by date would otherwise bury it.
 */
import { requireAdmin } from '../../../_lib/admin';
import { hasMissingRelated, insertArticle } from '../../../_lib/article-write';
import { BodyError, MalformedBody, readJson } from '../../../_lib/body';
import { requireDb } from '../../../_lib/env';
import {
  badRequest,
  created,
  dbUnavailable,
  json,
  misconfigured,
  route,
  unprocessable,
} from '../../../_lib/http';
import { readArticleInput } from '../../../_lib/inputs';
import { now, publication, uniqueId } from '../../../_lib/write';
import {
  QueryError,
  readArticleSort,
  readMedium,
  readPage,
  readPerPage,
  readSearch,
  readStatus,
} from '../../../_lib/query';
import { articleOrderBy, DRAFTS_FIRST, folded, likeTerm } from '../../../_lib/sql';
import { rowToArticle } from '../../../_lib/rows';
import { ARTICLE_COLUMNS } from '../../../_lib/articles';
import type { D1Database, Handler } from '../../../types';

/** The listing shows seven rows a page, as the design does. */
const DEFAULT_PER_PAGE = 7;
const MAX_PER_PAGE = 100;

export const onRequestGet: Handler = async ({ request, env }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  const url = new URL(request.url);
  let status: string | undefined;
  let medium: string | undefined;
  let search: string | undefined;
  let sort: ReturnType<typeof readArticleSort>;
  let page: number;
  let perPage: number;
  try {
    status = readStatus(url);
    medium = readMedium(url);
    search = readSearch(url);
    sort = readArticleSort(url);
    page = readPage(url);
    perPage = readPerPage(url, DEFAULT_PER_PAGE, MAX_PER_PAGE);
  } catch (error) {
    if (error instanceof QueryError) return badRequest(error.parameter);
    throw error;
  }

  const clauses: string[] = [];
  const values: unknown[] = [];
  if (status) {
    clauses.push('a.status = ?');
    values.push(status);
  }
  if (medium) {
    clauses.push('a.medium = ?');
    values.push(medium);
  }
  if (search) {
    // The term was folded on the way in; the column is folded here, so "ete"
    // finds "Un dernier été". Searching the title alone is deliberate — the
    // toolbar says "Rechercher un titre".
    clauses.push(`${folded('a.title')} LIKE ? ESCAPE '\\'`);
    values.push(likeTerm(search));
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';

  try {
    const [rows, totals, catalogue] = await db.batch([
      db
        .prepare(
          `SELECT ${ARTICLE_COLUMNS}
             FROM articles a
             ${where}
            ORDER BY ${DRAFTS_FIRST}, ${articleOrderBy(sort)}
            LIMIT ? OFFSET ?`,
        )
        .bind(...values, perPage, (page - 1) * perPage),
      db.prepare(`SELECT count(*) AS total FROM articles a ${where}`).bind(...values),
      db.prepare(
        `SELECT count(*) AS total,
                sum(CASE WHEN status = 'draft' THEN 1 ELSE 0 END) AS drafts
           FROM articles`,
      ),
    ]);

    const summary = catalogue.results[0] ?? {};
    return json({
      items: rows.results.map(rowToArticle),
      total: Number(totals.results[0]?.total ?? 0),
      page,
      perPage,
      catalogue: {
        total: Number(summary.total ?? 0),
        // `sum` over no rows is NULL, not 0 — an empty catalogue would otherwise
        // render "null brouillon".
        drafts: Number(summary.drafts ?? 0),
      },
    });
  } catch {
    return dbUnavailable();
  }
};

/**
 * Creates an avis and answers its id — which the client needs, because the id is
 * derived from the title here rather than chosen by the form.
 *
 * `status` comes from the payload, so "Enregistrer le brouillon" and "Publier"
 * are the same request with one field different. `publication()` keeps the
 * schema's published ⇔ dated invariant true either way.
 */
export const onRequestPost: Handler = async ({ request, env }) => {
  const check = await requireAdmin(request, env);
  if (!check.ok) return check.response;

  let db: D1Database;
  try {
    db = requireDb(env);
  } catch {
    return misconfigured();
  }

  let input: ReturnType<typeof readArticleInput>;
  try {
    input = readArticleInput(await readJson(request));
  } catch (error) {
    if (error instanceof BodyError) return unprocessable(error.field);
    if (error instanceof MalformedBody) return badRequest('corps');
    throw error;
  }

  try {
    const id = await uniqueId(db, input.title);
    if (await hasMissingRelated(db, id, input)) return unprocessable('related');

    await db.batch(insertArticle(db, id, input, publication(input.status), now()));
    return created({ id });
  } catch {
    return dbUnavailable();
  }
};

export const onRequest = route({ GET: onRequestGet, POST: onRequestPost });
