import { useState } from 'react';
import DashboardHeader from './DashboardHeader';
import StatStrip from './StatStrip';
import Leaderboard from './Leaderboard';
import TrendCard from './TrendCard';
import TodoCard from './TodoCard';
import NewsletterCta from './NewsletterCta';
import Fab from './Fab';
import { DEFAULT_PERIOD } from '../../mock/dashboard';
import styles from './AdminDashboard.module.css';

/**
 * Admin Tableau de bord (design 6b desktop → 6h mobile): KPI band, publications
 * leaderboard, and a side column of views trend / drafts / newsletter CTA. All
 * data is static mock content from src/mock/dashboard.ts.
 */
export default function AdminDashboardPage() {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);

  return (
    <section className={styles.page} data-testid="admin-dashboard-page" data-anim="stagger">
      <DashboardHeader period={period} onPeriodChange={setPeriod} />
      <StatStrip period={period} />
      <div className={styles.grid} data-anim="stagger">
        <Leaderboard />
        <div className={styles.side} data-anim="stagger">
          <TrendCard />
          <TodoCard />
          <NewsletterCta />
        </div>
      </div>
      <Fab />
    </section>
  );
}
