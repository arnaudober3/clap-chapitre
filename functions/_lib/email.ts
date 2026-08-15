/**
 * Outbound e-mail, over Resend's HTTP API — the only email transport this
 * project has, since Pages Functions carry no `nodejs_compat` and therefore
 * no SMTP. `fetch` is all either endpoint needs.
 *
 * `sendBatch` is best-effort: a chunk's HTTP failure counts every message in
 * it as failed and the loop moves to the next chunk. No retry queue — the
 * same scope discipline the comment guards and the crawler heuristic already
 * accept elsewhere in this codebase ("misses some, and that's fine").
 */

const RESEND_SINGLE_URL = 'https://api.resend.com/emails';
const RESEND_BATCH_URL = 'https://api.resend.com/emails/batch';

/** Resend accepts at most 100 messages per batch call. */
const BATCH_CHUNK_SIZE = 100;

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
}

/** One address, one message — the test-send path. */
export async function sendOne(apiKey: string, from: string, message: EmailMessage): Promise<boolean> {
  const response = await fetch(RESEND_SINGLE_URL, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ from, to: message.to, subject: message.subject, html: message.html }),
  });
  return response.ok;
}

/**
 * Every recipient gets their own message — never one shared `to` list — since
 * each carries a personalized unsubscribe link. Chunked so a subscriber base
 * past Resend's 100-per-call ceiling still sends, one HTTP round trip per
 * chunk.
 */
export async function sendBatch(
  apiKey: string,
  from: string,
  messages: EmailMessage[],
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (let i = 0; i < messages.length; i += BATCH_CHUNK_SIZE) {
    const chunk = messages.slice(i, i + BATCH_CHUNK_SIZE);
    try {
      const response = await fetch(RESEND_BATCH_URL, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(
          chunk.map((message) => ({ from, to: message.to, subject: message.subject, html: message.html })),
        ),
      });
      if (response.ok) sent += chunk.length;
      else failed += chunk.length;
    } catch {
      failed += chunk.length;
    }
  }

  return { sent, failed };
}
