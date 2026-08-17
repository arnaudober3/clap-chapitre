/**
 * The bilan → e-mail pipeline: an edition built from a bilan row and its avis,
 * then rendered as standalone HTML.
 *
 * This duplicates, rather than imports, the display constants and structural
 * shape `EmailPreview.tsx`/`src/newsletter.ts` also encode on the client —
 * the same `functions/_lib` vs. `src/` independence `audience.ts`'s
 * `MONTH_ABBREV` already accepts. And it duplicates the shape, not the
 * rendering: e-mail clients read neither CSS Modules nor external
 * stylesheets, so every rule here is inline.
 */
import { hmacSha256Hex } from './crypto';
import type { Medium } from '../../shared/content';

/** How many coups de cœur the e-mail carries — a teaser, not the whole bilan. */
export const HIGHLIGHTS_IN_EMAIL = 2;

const MEDIUM_CHIP_LABEL: Record<Medium, string> = {
  film: 'Film',
  serie: 'Série',
  livre: 'Livre',
  doc: 'Docs',
};

const MEDIUM_ACCENT: Record<Medium, string> = {
  film: '#b0502f',
  serie: '#4f6f7c',
  livre: '#6a7a45',
  doc: '#8a5a7a',
};

export interface EmailHighlight {
  id: string;
  medium: Medium;
  label: string;
  title: string;
  hook: string;
  coverUrl: string;
}

export interface EmailEdition {
  id: string;
  monthLabel: string;
  year: number;
  eyebrow: string;
  title: string;
  mood: string;
  subject: string;
  highlights: EmailHighlight[];
}

type Row = Record<string, unknown>;

function text(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/** Builds the previewable edition from a bilan row and its avis, newest bilan_avis order first. */
export function buildEdition(bilan: Row, avis: Row[], siteOrigin: string): EmailEdition {
  const monthLabel = text(bilan.month_label);
  const year = Number(bilan.year) || 0;

  return {
    id: text(bilan.id),
    monthLabel,
    year,
    eyebrow: `Le courrier du mois · ${monthLabel} ${year}`,
    title: text(bilan.title),
    mood: text(bilan.mood),
    subject: `Clap et chapitre — ${text(bilan.title)}`,
    highlights: avis.slice(0, HIGHLIGHTS_IN_EMAIL).map((row) => {
      const medium = text(row.medium) as Medium;
      const cover = text(row.cover);
      return {
        id: text(row.id),
        medium,
        label: `${MEDIUM_CHIP_LABEL[medium] ?? medium} · coup de cœur`,
        title: text(row.title),
        hook: text(row.hook) || text(row.excerpt),
        coverUrl: cover ? `${siteOrigin}/api/media/${cover}` : '',
      };
    }),
  };
}

/** The per-recipient unsubscribe token — the same HMAC the subscribe/unsubscribe routes use. */
export function unsubscribeToken(emailAddress: string, secret: string): Promise<string> {
  return hmacSha256Hex(secret, emailAddress);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Standalone, inline-styled HTML — no external stylesheet, no CSS custom
 * property, both silently ignored by mail clients. Mirrors `EmailPreview.tsx`'s
 * structure: masthead, eyebrow, title, mood, highlight rows, a CTA to the full
 * bilan, and a footer carrying the two links the preview only describes in text.
 */
export function renderEmailHtml(
  edition: EmailEdition,
  unsubscribeUrl: string,
  bilanUrl: string,
): string {
  const highlights = edition.highlights
    .map(
      (highlight) => `
        <tr>
          <td style="padding:20px 0;border-top:1px solid #e6dcc8;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                ${
                  highlight.coverUrl
                    ? `<td width="88" valign="top" style="padding-right:16px;">
                         <img src="${escapeHtml(highlight.coverUrl)}" width="88" height="120"
                              alt="" style="display:block;border-radius:4px;object-fit:cover;" />
                       </td>`
                    : ''
                }
                <td valign="top">
                  <div style="font:600 12px/1.4 Georgia,serif;text-transform:uppercase;
                              letter-spacing:.04em;color:${MEDIUM_ACCENT[highlight.medium] ?? '#b0502f'};">
                    ${escapeHtml(highlight.label)}
                  </div>
                  <div style="font:600 18px/1.3 Georgia,serif;color:#3f2e20;margin-top:6px;">
                    ${escapeHtml(highlight.title)}
                  </div>
                  <div style="font:400 14px/1.5 Georgia,serif;color:#5a4130;margin-top:6px;">
                    ${escapeHtml(highlight.hook)}
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`,
    )
    .join('');

  return `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(edition.subject)}</title>
  </head>
  <body style="margin:0;padding:0;background:#fdf8f0;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf8f0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
            <tr>
              <td style="padding-bottom:24px;text-align:center;">
                <svg width="30" height="30" viewBox="0 0 100 100" style="vertical-align:middle;margin-right:8px;">
                  <path transform="rotate(-4 50 50)" fill="#b0502f"
                        d="M42,0 A58,45 0 0 1 100,45 A55,55 0 0 1 45,100 A45,55 0 0 1 0,45 A42,45 0 0 1 42,0 Z" />
                  <text x="50" y="50" dx="-3.5" dy="5" text-anchor="middle" dominant-baseline="central"
                        font-family="Georgia,serif" font-style="italic" font-size="50" fill="#fdf8f0">C</text>
                </svg>
                <span style="font:400 22px/1 Georgia,serif;color:#3f2e20;vertical-align:middle;">Clap</span>
                <span style="font:italic 400 22px/1 Georgia,serif;color:#b0502f;vertical-align:middle;"> et </span>
                <span style="font:400 22px/1 Georgia,serif;color:#3f2e20;vertical-align:middle;">chapitre</span>
              </td>
            </tr>
            <tr>
              <td style="background:#fff;border-radius:8px;padding:32px;">
                <div style="font:600 12px/1.4 Georgia,serif;text-transform:uppercase;
                            letter-spacing:.04em;color:#b0502f;">
                  ${escapeHtml(edition.eyebrow)}
                </div>
                <h1 style="font:600 26px/1.3 Georgia,serif;color:#3f2e20;margin:10px 0 0;">
                  ${escapeHtml(edition.title)}
                </h1>
                ${
                  edition.mood
                    ? `<p style="font:italic 400 15px/1.5 Georgia,serif;color:#5a4130;margin:12px 0 0;">
                         ${escapeHtml(edition.mood)}
                       </p>`
                    : ''
                }
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:8px;">
                  ${highlights}
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:24px;">
                  <tr>
                    <td align="center">
                      <a href="${escapeHtml(bilanUrl)}"
                         style="display:inline-block;background:#d8a24a;color:#3f2e20;
                                font:600 14px/1 Georgia,serif;text-decoration:none;
                                padding:14px 28px;border-radius:4px;">
                        Lire le bilan complet →
                      </a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:20px 8px;text-align:center;">
                <p style="font:400 12px/1.6 Georgia,serif;color:#8a7a68;margin:0;">
                  Vous recevez ce courrier, car vous êtes abonné·e à Clap et chapitre.<br />
                  <a href="${escapeHtml(unsubscribeUrl)}" style="color:#8a7a68;">Se désabonner</a>
                  ·
                  <a href="${escapeHtml(bilanUrl)}" style="color:#8a7a68;">Voir sur le site</a>
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
