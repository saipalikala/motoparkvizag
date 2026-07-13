import { useEffect, useState } from 'react';
import { BarChart3, FolderTree, IndianRupee, Package, ShoppingBag } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import { getDashboardStats } from '../services/adminStats.js';
import styles from './AdminDashboard.module.css';

/**
 * AdminDashboard — Milestone 1 shell. Four summary tiles wired to cheap real
 * counts (Orders, Products, Categories) plus a Revenue placeholder (no aggregate
 * endpoint on V1 yet — arrives with the Analytics milestone). Rich widgets land
 * later; this proves the auth → API → data path end-to-end.
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
        // Individual stats already degrade to null inside the service; a total
        // failure (e.g. network) leaves every tile showing its placeholder.
        if (alive) setStats({ orders: null, products: null, categories: null, revenue: null });
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
        subtitle="Store overview at a glance. Live operational widgets arrive as each module ships."
      />

      <div className={styles.grid}>
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
          label="Categories"
          value={stats?.categories}
          icon={FolderTree}
          accent="blue"
          loading={loading}
          hint="Taxonomy"
        />
        <StatCard
          label="Revenue"
          value={stats?.revenue == null ? null : formatINR(stats.revenue)}
          icon={IndianRupee}
          accent="green"
          loading={loading}
          hint="Coming with Analytics"
        />
      </div>

      <div className={styles.note}>
        <BarChart3 size={18} className={styles.noteIcon} aria-hidden="true" />
        <p>
          Foundation is live. Next up on the roadmap: <strong>Products</strong> — full catalog
          management reading the existing categories and brands.
        </p>
      </div>
    </div>
  );
}
