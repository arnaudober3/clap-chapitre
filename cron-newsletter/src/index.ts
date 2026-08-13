/**
 * The whole job: on each tick, ask the Pages project to send whatever
 * newsletter is due. All the logic — which sends are due, building the
 * e-mail, calling Resend — lives there
 * (`functions/api/admin/newsletter/dispatch.ts`); this Worker only holds the
 * clock Pages Functions cannot.
 */
export interface Env {
  DISPATCH_URL: string;
  CRON_SECRET: string;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(
      fetch(env.DISPATCH_URL, {
        method: 'POST',
        headers: { 'x-cron-secret': env.CRON_SECRET },
      }),
    );
  },
};
