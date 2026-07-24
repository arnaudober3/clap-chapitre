import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { periods } from '../../mock/dashboard';
import styles from './AdminDashboard.module.css';

/**
 * Dashboard title row (design 6b): serif title + subtitle on the left, a period
 * selector and the primary "+ Nouvel article" action on the right. The period
 * pill is a real (mock) dropdown that drives the KPI band via `onPeriodChange`;
 * the action links to the Nouvel article form.
 */
export default function DashboardHeader({
  period,
  onPeriodChange,
}: {
  period: string;
  onPeriodChange: (periodId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const options = periods();
  const current = options.find((p) => p.id === period) ?? options[0];

  // Close the menu on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  function select(periodId: string) {
    onPeriodChange(periodId);
    setOpen(false);
  }

  return (
    <div className={styles.header}>
      <div>
        <h1 className={styles.title}>Tableau de bord</h1>
        <p className={styles.subtitle}>Ce qui marche ce mois-ci</p>
      </div>
      <div className={styles.headerActions}>
        <div className={styles.period} ref={menuRef}>
          <button
            type="button"
            className={styles.periodPill}
            aria-haspopup="listbox"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {current.label} <span aria-hidden="true">▾</span>
          </button>
          {open && (
            <ul className={styles.periodMenu} role="listbox" aria-label="Période">
              {options.map((option) => (
                <li key={option.id} role="option" aria-selected={option.id === period}>
                  <button
                    type="button"
                    className={
                      option.id === period
                        ? `${styles.periodOption} ${styles.periodOptionActive}`
                        : styles.periodOption
                    }
                    onClick={() => select(option.id)}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
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
