/**
 * What is left of the dashboard mock: the newsletter card, and nothing else.
 *
 * Every other figure the tableau de bord shows — the KPI band, the trend, the
 * palmarès, the drafts list — now comes from `/api/admin/dashboard`. The
 * newsletter is the exception because the newsletter itself is: sending e-mail
 * is outside the scope of the read-only work, so its tooling still reads
 * `src/mock/newsletter.ts`, and this card has to agree with the page it links to.
 *
 * The shapes the cards render live in `src/content/dashboard.ts`; this file
 * holds one value.
 */
import { defaultNewsletterSource, subscriberStats } from './newsletter';
import { ofMonth } from '../format';

/** The state of the edition waiting to be sent. */
export interface NewsletterStatus {
  edition: string;
  subscribers: number;
  ready: boolean;
}

/**
 * Derived, not spelled out: the edition awaiting send is the one the newsletter
 * section would generate right now, and the audience is the same figure that
 * page shows — the CTA here and the page it links to must never disagree.
 */
const NEWSLETTER: NewsletterStatus = {
  edition: `Newsletter ${ofMonth(defaultNewsletterSource().monthLabel)}`,
  subscribers: subscriberStats().total,
  ready: true,
};

/** The newsletter edition awaiting send. */
export function newsletter(): NewsletterStatus {
  return NEWSLETTER;
}
