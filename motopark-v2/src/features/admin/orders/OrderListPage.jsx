import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { formatINR } from '@/lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import StatusBadge from './StatusBadge.jsx';
import { FILTERABLE_STATUSES, listOrders, statusMeta } from './orderService.js';
import styles from './OrderListPage.module.css';

const PAGE_SIZE = 20;

const fmtDate = (d) => {
  try {
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

export default function OrderListPage() {
  const [data, setData] = useState({ rows: [], total: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(''); // '' = all

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listOrders({ page, limit: PAGE_SIZE, status: status || undefined }));
    } catch (err) {
      setError(err?.message ?? 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, [page, status]);

  useEffect(() => {
    load();
  }, [load]);

  const onStatusChange = (e) => {
    setPage(1);
    setStatus(e.target.value);
  };

  const columns = useMemo(
    () => [
      {
        key: 'shortId',
        header: 'Order',
        render: (row) => (
          <Link className={styles.idLink} to={`/admin/orders/${row.id}`}>
            #{row.shortId}
          </Link>
        ),
      },
      { key: 'date', header: 'Date', render: (row) => <span className={styles.muted}>{fmtDate(row.createdAt)}</span> },
      {
        key: 'customer',
        header: 'Customer',
        render: (row) => (
          <div className={styles.customer}>
            <span className={styles.custName}>{row.customerName}</span>
            {row.customerPhone && <span className={styles.custPhone}>{row.customerPhone}</span>}
          </div>
        ),
      },
      {
        key: 'total',
        header: 'Total',
        align: 'right',
        render: (row) => <span className={styles.total}>{formatINR(row.total)}</span>,
      },
      {
        key: 'payment',
        header: 'Payment',
        render: (row) => (
          <span className={`${styles.pay} ${row.payment.paid ? styles.payPaid : styles.payCod}`}>
            {row.payment.label}
          </span>
        ),
      },
      { key: 'status', header: 'Status', render: (row) => <StatusBadge status={row.status} size="sm" /> },
      {
        key: 'actions',
        header: '',
        align: 'right',
        width: 120,
        render: (row) => (
          <Link to={`/admin/orders/${row.id}`} className={styles.manage}>
            Manage <ArrowRight size={14} />
          </Link>
        ),
      },
    ],
    [],
  );

  return (
    <div>
      <PageHeader
        title="Orders"
        subtitle={data.total ? `${data.total} order${data.total === 1 ? '' : 's'}` : 'Process and fulfil customer orders'}
        actions={
          <label className={styles.filter}>
            <span className={styles.filterLabel}>Status</span>
            <select className={styles.select} value={status} onChange={onStatusChange}>
              <option value="">All</option>
              {FILTERABLE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {statusMeta(s).label}
                </option>
              ))}
            </select>
          </label>
        }
      />

      {error ? (
        <div className={styles.error} role="alert">
          {error}{' '}
          <button type="button" className={styles.retry} onClick={load}>
            Retry
          </button>
        </div>
      ) : (
        <DataTable
          columns={columns}
          rows={data.rows}
          rowKey={(row) => row.id}
          loading={loading}
          skeletonRows={8}
          empty={status ? `No ${statusMeta(status).label.toLowerCase()} orders.` : 'No orders yet.'}
        />
      )}

      {data.pages > 1 && (
        <div className={styles.pager}>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={loading || page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </button>
          <span className={styles.pageInfo}>
            Page {data.page} of {data.pages}
          </span>
          <button
            type="button"
            className={styles.pageBtn}
            disabled={loading || page >= data.pages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
