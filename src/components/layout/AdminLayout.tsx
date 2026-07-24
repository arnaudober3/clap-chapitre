import { Outlet } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import styles from './AdminLayout.module.css';

/**
 * Espace admin shell (design 6b / 6h / 7a): a sober back-office in the Salon
 * world, kept separate from the public Layout. Desktop = left rail; mobile =
 * top bar + slide-in drawer. The rail/drawer live in <AdminHeader>; pages
 * render through the <Outlet>.
 */
export default function AdminLayout() {
  return (
    <div className={styles.shell}>
      <AdminHeader />
      <div className={styles.content}>
        <main className={styles.main}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
