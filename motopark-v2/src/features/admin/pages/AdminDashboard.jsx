import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { BarChart3, IndianRupee, Package, ShoppingBag, Users } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { getDashboardStats } from '../services/adminStats.js';
import styles from './AdminDashboard.module.css';

/**
 * AdminDashboard — store overview. Four summary tiles wired to the real
 * aggregation endpoint (GET /api/admin/stats): Revenue is summed server-side,
 * so no client-side money math. A total request failure leaves every tile
 * showing its placeholder dash.
 */
export default function AdminDashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    getDashboardStats()
      .then((s) => {
        if (alive) setStats(s);
      })
      .catch(() => {
        if (alive) setStats({ revenue: null, orders: null, products: null, customers: null });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        subtitle="Store overview at a glance. Revenue is summed across all non-cancelled orders."
      />

      <div className={styles.grid}>
        <StatCard
          label="Revenue"
          value={stats?.revenue == null ? null : formatINR(stats.revenue)}
          icon={IndianRupee}
          accent="green"
          loading={loading}
          hint="Excludes cancelled & returned"
        />
        <StatCard
          label="Orders"
          value={stats?.orders}
          icon={ShoppingBag}
          accent="navy"
          loading={loading}
          hint="All time"
        />
        <StatCard
          label="Active Products"
          value={stats?.products}
          icon={Package}
          accent="orange"
          loading={loading}
          hint="In catalog"
        />
        <StatCard
          label="Customers"
          value={stats?.customers}
          icon={Users}
          accent="blue"
          loading={loading}
          hint="Registered"
        />
      </div>

      <div className={styles.note}>
        <BarChart3 size={18} className={styles.noteIcon} aria-hidden="true" />
        <p>
          Want deeper insight? The <Link to="/admin/analytics">AI Usage dashboard</Link> tracks
          assistant calls, cost, and latency, and <Link to="/admin/settings">Settings</Link> controls
          store shipping rules.
        </p>
      </div>
    </div>
  );
}
