import { useCallback, useEffect, useMemo, useState } from 'react';
import { Activity, CheckCircle2, Clock, Coins, Cpu, Wrench } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import StatCard from '../components/StatCard.jsx';
import DataTable from '../components/DataTable.jsx';
import { getAiStats, WINDOW_OPTIONS } from './aiAnalyticsService.js';
import styles from './AiAnalyticsPage.module.css';

const numFmt = new Intl.NumberFormat('en-US');
const usdFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

const fmtNum = (n) => (n == null ? '—' : numFmt.format(n));
const fmtPct = (r) => (r == null ? '—' : `${(r * 100).toFixed(1)}%`);
const fmtUsd = (u) => (u == null ? '—' : usdFmt.format(u));

const fmtDateTime = (d) => {
  try {
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const truncate = (s, n = 48) => {
  if (!s) return '—';
  return s.length > n ? `${s.slice(0, n)}…` : s;
};

export default function AiAnalyticsPage() {
  const [days, setDays] = useState(7);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setStats(await getAiStats(days));
    } catch (err) {
      setError(err?.message ?? 'Failed to load AI usage stats.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const maxToolCount = useMemo(
    () => (stats?.topTools?.length ? Math.max(...stats.topTools.map((t) => t.count)) : 0),
    [stats],
  );

  const logColumns = useMemo(
    () => [
      { key: 'at', header: 'Time', render: (r) => <span className={styles.muted}>{fmtDateTime(r.at)}</span> },
      {
        key: 'kind',
        header: 'Kind',
        render: (r) => <span className={`${styles.kind} ${styles[`kind_${r.kind?.replace('-', '_')}`] ?? ''}`}>{r.kind}</span>,
      },
      { key: 'model', header: 'Model', render: (r) => <span className={styles.mono}>{r.model || '—'}</span> },
      { key: 'query', header: 'Query', render: (r) => <span title={r.query || ''}>{truncate(r.query)}</span> },
      {
        key: 'tools',
        header: 'Tools',
        render: (r) =>
          r.tools?.length ? (
            <span className={styles.mono}>{r.tools.join(', ')}</span>
          ) : (
            <span className={styles.muted}>—</span>
          ),
      },
      { key: 'tokens', header: 'Tokens', align: 'right', render: (r) => fmtNum(r.tokens) },
      {
        key: 'cost',
        header: 'Cost',
        align: 'right',
        render: (r) => <span className={styles.mono}>{fmtUsd((r.costMicroUsd || 0) / 1e6)}</span>,
      },
      { key: 'latencyMs', header: 'Latency', align: 'right', render: (r) => `${fmtNum(r.latencyMs)} ms` },
      {
        key: 'resolved',
        header: 'Resolved',
        align: 'center',
        render: (r) => (
          <span className={r.resolved ? styles.ok : styles.fail}>{r.resolved ? 'Yes' : 'No'}</span>
        ),
      },
    ],
    [],
  );

  const latencyValue =
    stats == null ? null : `${fmtNum(stats.latency.p50)} / ${fmtNum(stats.latency.p95)} ms`;

  return (
    <div>
      <PageHeader
        title="AI Usage"
        subtitle="MotoBuddy assistant observability — calls, cost, latency, and tool usage."
        actions={
          <label className={styles.filter}>
            <span className={styles.filterLabel}>Window</span>
            <select
              className={styles.select}
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              {WINDOW_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
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
        <>
          <div className={styles.kpiGrid}>
            <StatCard label="Total Calls" value={stats?.totalCalls} icon={Activity} accent="navy" loading={loading} hint={`Last ${stats?.windowDays ?? days} days`} />
            <StatCard label="Resolved Rate" value={stats == null ? null : fmtPct(stats.resolvedRate)} icon={CheckCircle2} accent="green" loading={loading} hint="Grounded answers" />
            <StatCard label="Total Tokens" value={stats == null ? null : fmtNum(stats.totalTokens)} icon={Cpu} accent="blue" loading={loading} hint="Prompt + completion" />
            <StatCard label="Total Cost" value={stats == null ? null : fmtUsd(stats.costUsd)} icon={Coins} accent="orange" loading={loading} hint="Converted from µUSD" />
            <StatCard label="Latency p50 / p95" value={latencyValue} icon={Clock} accent="navy" loading={loading} hint={stats == null ? undefined : `avg ${fmtNum(stats.latency.avg)} ms`} />
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Wrench size={16} aria-hidden="true" /> Tool Usage
            </h2>
            {loading ? (
              <div className={styles.bars}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className={`skeleton ${styles.barSkeleton}`} />
                ))}
              </div>
            ) : stats?.topTools?.length ? (
              <div className={styles.bars}>
                {stats.topTools.map((t) => (
                  <div key={t.name} className={styles.barRow}>
                    <span className={styles.barLabel} title={t.name}>
                      {t.name}
                    </span>
                    <div className={styles.barTrack}>
                      <div
                        className={styles.barFill}
                        style={{ width: `${maxToolCount ? (t.count / maxToolCount) * 100 : 0}%` }}
                      />
                    </div>
                    <span className={styles.barCount}>{fmtNum(t.count)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className={styles.empty}>No tool calls recorded in this window.</p>
            )}
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>
              <Activity size={16} aria-hidden="true" /> Recent Calls
            </h2>
            <DataTable
              columns={logColumns}
              rows={stats?.recent ?? []}
              rowKey={(row, i) => `${row.at}-${i}`}
              loading={loading}
              skeletonRows={8}
              empty="No AI calls recorded in this window."
            />
          </section>
        </>
      )}
    </div>
  );
}
