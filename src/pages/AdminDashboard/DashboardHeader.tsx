import { Link } from 'react-router-dom';
import type { Period } from '../../content/dashboard';
import { AdminSelect } from '../../components/ui';
import styles from './AdminDashboard.module.css';

/**
 * Dashboard title row (design 6b): serif title + subtitle on the left, a period
 * selector and the primary "+ Nouvel article" action on the right. The period
 * pill is a real (mock) dropdown that drives the KPI band via `onPeriodChange`;
 * the action links to the Nouvel article form.
 */
export default function DashboardHeader({
  period,
  periods,
  onPeriodChange,
}: {
  period: string;
  periods: Period[];
  onPeriodChange: (periodId: string) => void;
}) {
  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Tableau de bord</h1>
        <p className={styles.subtitle}>Ce qui marche ce mois-ci</p>
      </div>
      <div className={styles.headerActions}>
        <AdminSelect
          label="Période"
          value={period}
          options={periods}
          onChange={onPeriodChange}
        />
        <Link to="/admin/articles/nouveau" className={styles.newButton}>
          <span className={styles.newButtonPlus} aria-hidden="true">
            +
          </span>
          Nouvel article
        </Link>
      </div>
    </div>
  );
}
