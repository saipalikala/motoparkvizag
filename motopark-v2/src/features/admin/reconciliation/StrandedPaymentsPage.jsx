import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatINR } from '@/lib/format.js';
import PageHeader from '../components/PageHeader.jsx';
import DataTable from '../components/DataTable.jsx';
import { GRACE_OPTIONS, listStrandedPayments } from './reconciliationService.js';
import styles from './StrandedPaymentsPage.module.css';

const PAGE_SIZE = 20;

const fmtDateTime = (d) => {
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const fmtAge = (mins) => {
  const m = Number(mins) || 0;
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ${m % 60}m ago`;
  const days = Math.floor(h / 24);
  return `${days}d ${h % 24}h ago`;
};

export default function StrandedPaymentsPage() {
  const [data, setData] = useState({ rows: [], total: 0, totalAmountRupees: 0, page: 1, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [graceMinutes, setGraceMinutes] = useState(15);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await listStrandedPayments({ page, limit: PAGE_SIZE, graceMinutes }));
    } catch (err) {
      setError(err?.message ?? 'Failed to load stranded payments.');
    } finally {
      setLoading(false);
    }
  }, [page, graceMinutes]);

  useEffect(() => {
    load();
  }, [load]);

  const onGraceChange = (e) => {
    setPage(1);
    setGraceMinutes(Number(e.target.value));
  };

  const columns = useMemo(
    () => [
      {
        key: 'paymentId',
        header: 'Payment ID',
        render: (row) => <span className={styles.mono}>{row.paymentId}</span>,
      },
      {
        key: 'captured',
        header: 'Captured',
        render: (row) => (
          <div className={styles.captured}>
            <span className={styles.muted}>{fmtDateTime(row.capturedAt)}</span>
            <span className={styles.capturedAge}>{fmtAge(row.ageMinutes)}</span>
          </div>
        ),
      },
      {
        key: 'amount',
        header: 'Amount',
        align: 'right',
        render: (row) => <span className={styles.amount}>{formatINR(row.amountRupees)}</span>,
      },
      {
        key: 'contact',
        header: 'Customer contact',
        render: (row) =>
          row.email || row.contact ? (
            <div className={styles.contact}>
              {row.email && <span className={styles.contactEmail}>{row.email}</span>}
              {row.contact && <span className={styles.contactPhone}>{row.contact}</span>}
            </div>
          ) : (
            <span className={styles.contactNone}>—</span>
          ),
      },
      {
        key: 'razorpayOrderId',
        header: 'Razorpay order',
        render: (row) =>
          row.razorpayOrderId ? (
            <span className={styles.monoMuted}>{row.razorpayOrderId}</span>
          ) : (
            <span className={styles.muted}>—</span>
          ),
      },
    ],
    [],
  );

  const subtitle = data.total
    ? `${data.total} stranded · ${formatINR(data.totalAmountRupees)} to reconcile`
    : 'Captured payments with no matching order';

  return (
    <div>
      <PageHeader
        title="Reconciliation"
        subtitle={subtitle}
        actions={
          <label className={styles.filter}>
            <span className={styles.filterLabel}>Older than</span>
            <select className={styles.select} value={graceMinutes} onChange={onGraceChange}>
              {GRACE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        }
      />

      <div className={styles.banner}>
        <strong>These customers paid, but no order was recorded.</strong> Razorpay
        captured the payment and the webhook logged it, but nothing in the orders
        collection carries the same payment ID — the customer likely dropped off
        after paying. The webhook can’t rebuild the order (it has no cart or
        address), so each needs handling by hand: contact the customer to complete
        it, or refund the payment from the Razorpay dashboard. Payments newer than
        the grace window are hidden, since a checkout may still be in flight.
      </div>

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
          rowKey={(row) => row.paymentId}
          loading={loading}
          skeletonRows={6}
          empty="No stranded payments — every captured payment has a matching order."
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
