import { describe, it, expect, beforeEach } from "vitest";
import { onRequest as replyRoute } from "../../functions/api/admin/comments/[id]/reply";
import { onRequest as commentRoute } from "../../functions/api/admin/comments/[id]";
import { onRequest as commentsRoute } from "../../functions/api/comments";
import { onRequest as articleRoute } from "../../functions/api/articles/[id]";
import { createTestDb } from "./d1";
import { TEST_ENV, signTestToken } from "./api-server";
import { SEED } from "./fixtures";
import type { D1Database } from "../../functions/types";

let db: D1Database & { close(): void };

beforeEach(async () => {
  db = createTestDb();
  await db.exec(SEED);
});

const env = () => ({ ...TEST_ENV, DB: db });

async function reply(id: string, body?: unknown, signedIn = true) {
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (signedIn) headers.authorization = `Bearer ${await signTestToken()}`;
  return replyRoute({
    request: new Request(`http://localhost/api/admin/comments/${id}/reply`, {
      method: "POST",
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
    env: env(),
    params: { id },
  });
}

async function approve(id: string) {
  return commentRoute({
    request: new Request(`http://localhost/api/admin/comments/${id}`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${await signTestToken()}`,
      },
      body: JSON.stringify({ status: "approved" }),
    }),
    env: env(),
    params: { id },
  });
}

/** Drop a fresh, replyless root comment through the public endpoint and approve it. */
async function freshRoot(): Promise<string> {
  await commentsRoute({
    request: new Request("http://localhost/api/comments", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "cf-connecting-ip": "203.0.113.9",
      },
      body: JSON.stringify({
        targetType: "article",
        targetId: "un-dernier-ete",
        author: "Sacha",
        body: "Bravo pour cet avis.",
        trap: "",
        openedAt: Date.now() - 10_000,
      }),
    }),
    env: env(),
  });
  const row = (await db
    .prepare("SELECT id FROM comments WHERE author = 'Sacha'")
    .first<{ id: string }>())!;
  await approve(row.id);
  return row.id;
}

describe("WR-11 admin reply", () => {
  it("needs the admin token — an anonymous caller cannot answer a thread", async () => {
    const response = await reply("c-article-1", { body: "Merci !" }, false);
    expect(response.status).toBe(401);
  });

  it("404s on a comment that does not exist", async () => {
    const response = await reply("fantôme", { body: "Merci !" });
    expect(response.status).toBe(404);
  });

  it("422s a missing or blank body", async () => {
    expect((await reply("c-article-1", {})).status).toBe(422);
    expect((await reply("c-article-1", { body: "   " })).status).toBe(422);
  });

  it("refuses to answer a reply — the thread is one level deep", async () => {
    // c-article-1-reponse is itself a reply in the fixture.
    const response = await reply("c-article-1-reponse", {
      body: "Encore merci.",
    });
    expect(response.status).toBe(422);
  });

  it("409s a comment that already has a reply, rather than burying a second one", async () => {
    // c-article-1 already carries c-article-1-reponse in the fixture.
    const response = await reply("c-article-1", { body: "Un deuxième mot." });
    expect(response.status).toBe(409);
  });

  it("writes an approved, undated, author reply and answers the row", async () => {
    const rootId = await freshRoot();

    const response = await reply(rootId, { body: "Merci à vous !" });
    expect(response.status).toBe(201);
    const payload = await response.json();
    expect(payload).toMatchObject({
      author: "Marie-Zoé",
      body: "Merci à vous !",
      isAuthor: true,
      likes: 0,
    });

    const row = await db
      .prepare(
        `SELECT target_type, target_id, parent_id, author, is_author, body,
                comment_date, status
           FROM comments WHERE id = ?`,
      )
      .bind(payload.id)
      .first();
    expect(row).toMatchObject({
      target_type: "article",
      target_id: "un-dernier-ete",
      parent_id: rootId,
      author: "Marie-Zoé",
      is_author: 1,
      body: "Merci à vous !",
      comment_date: null,
      status: "approved",
    });
  });

  it("lands in the public thread immediately — no moderation for the editor’s own voice", async () => {
    const rootId = await freshRoot();
    await reply(rootId, { body: "Merci à vous !" });

    const response = await articleRoute({
      request: new Request("http://localhost/api/articles/un-dernier-ete"),
      env: env(),
      params: { id: "un-dernier-ete" },
    });
    const payload = await response.json();
    const entry = payload.comments.find((c: { id: string }) => c.id === rootId);
    expect(entry?.reply).toMatchObject({
      author: "Marie-Zoé",
      body: "Merci à vous !",
    });
  });

  it("refuses a second reply to the same root", async () => {
    const rootId = await freshRoot();
    expect((await reply(rootId, { body: "Premier mot." })).status).toBe(201);
    expect((await reply(rootId, { body: "Second mot." })).status).toBe(409);
  });
});
