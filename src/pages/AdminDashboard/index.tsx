import { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import StatStrip from './StatStrip';
import Leaderboard from './Leaderboard';
import TrendCard from './TrendCard';
import TodoCard from './TodoCard';
import NewsletterCta from './NewsletterCta';
import Fab from './Fab';
import { useAdminDashboard } from '../../api/admin';
import { ranked, type Draft } from '../../content/dashboard';
import { PageError, PageLoading } from '../../components/ui';
import styles from './AdminDashboard.module.css';

/**
 * Admin Tableau de bord (design 6b desktop → 6h mobile): KPI band, publications
 * leaderboard, and a side column of views trend / drafts / newsletter CTA.
 *
 * One request feeds five of the six cards. They used to call a selector each,
 * which was free when the data was an import and would now be five round-trips
 * for one screen — so the page fetches and the cards take props.
 *
 * `NewsletterCta` is the exception and still reads the mock: the newsletter is
 * out of this change's scope, and its card is the one thing here that does not
 * come from the content tables.
 */
export default function AdminDashboardPage() {
  const [period, setPeriod] = useState<string>();
  const { data, status, reload } = useAdminDashboard(period);

  if (status === 'loading' || status === 'idle') {
    return (
      <section className={styles.page} data-testid="admin-dashboard-page" data-anim="stagger">
        <PageLoading />
      </section>
    );
  }

  if (!data) {
    return (
      <section className={styles.page} data-testid="admin-dashboard-page" data-anim="stagger">
        <PageError onRetry={reload} />
      </section>
    );
  }

  // "Brouillon" is what the row says whatever it is a draft of; the kind itself
  // is carried for a future link, not for this label.
  const drafts: Draft[] = data.drafts.map((draft) => ({
    id: draft.id,
    title: draft.title,
    kindLabel: 'Brouillon',
  }));

  return (
    <section className={styles.page} data-testid="admin-dashboard-page" data-anim="stagger">
      <DashboardHeader
        period={data.period}
        periods={data.periods}
        onPeriodChange={setPeriod}
      />
      <StatStrip stats={data.kpis} />
      <div className={styles.grid} data-anim="stagger">
        <Leaderboard entries={ranked(data.leaderboard)} />
        <div className={styles.side} data-anim="stagger">
          <TrendCard points={data.trend} peak={data.trendPeak} />
          <TodoCard items={drafts} />
          <NewsletterCta />
        </div>
      </div>
      <Fab />
    </section>
  );
}
