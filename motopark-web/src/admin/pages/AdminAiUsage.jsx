import { useCallback, useEffect, useState } from "react";
import StatCard from "../components/StatCard";
import { adminGet } from "@/config/api";
import "./AdminAiUsage.css";

/* ── tiny inline icons for the KPI cards ── */
const I = (p) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" {...p} />
);
const CallsIcon = () => <I><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></I>;
const OkIcon = () => <I><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></I>;
const CostIcon = () => <I><line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></I>;
const LatIcon = () => <I><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></I>;
const TokIcon = () => <I><path d="M4 7V4h16v3" /><path d="M9 20h6" /><path d="M12 4v16" /></I>;

const DAYS = [7, 30, 90];

export default function AdminAiUsage() {
    const [days, setDays] = useState(7);
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await adminGet(`/ai/admin/stats?days=${days}`);
            setData(res);
        } catch (e) {
            setError(e?.message || "Failed to load AI usage.");
        } finally {
            setLoading(false);
        }
    }, [days]);

    useEffect(() => { load(); }, [load]);

    const totalTokens = data ? (data.tokens.prompt + data.tokens.completion) : 0;
    const maxTool = data?.topTools?.[0]?.count || 1;

    return (
        <div className="aiu">
            <header className="aiu__head">
                <div>
                    <h1 className="aiu__title">AI Assistant · Usage</h1>
                    <p className="aiu__sub">
                        MotoBuddy observability — cost, latency, tool usage &amp; resolution, from <code>aiCallLog</code>.
                    </p>
                </div>
                <div className="aiu__range" role="tablist" aria-label="Time range">
                    {DAYS.map((d) => (
                        <button
                            key={d}
                            role="tab"
                            aria-selected={days === d}
                            className={`aiu__range-btn${days === d ? " is-active" : ""}`}
                            onClick={() => setDays(d)}
                        >
                            {d}d
                        </button>
                    ))}
                </div>
            </header>

            {error && <div className="aiu__error">{error}</div>}

            {/* KPI row */}
            <div className="aiu__kpis">
                <StatCard title="Total AI calls" value={data?.totalCalls ?? 0} icon={CallsIcon} accent="#6366f1" loading={loading} />
                <StatCard title="Resolved" value={data ? Math.round(data.resolvedRate * 100) : 0} suffix="%" icon={OkIcon} accent="#22c55e" loading={loading} />
                <StatCard title="Cost" value={data?.cost.usd ?? 0} prefix="$" icon={CostIcon} accent="#f59e0b" loading={loading} animate={false} formatter={(v) => Number(v).toFixed(4)} />
                <StatCard title="Avg latency" value={data?.latencyMs.avg ?? 0} suffix=" ms" icon={LatIcon} accent="#3b82f6" loading={loading} />
                <StatCard title="p95 latency" value={data?.latencyMs.p95 ?? 0} suffix=" ms" icon={LatIcon} accent="#8b5cf6" loading={loading} />
                <StatCard title="Tokens" value={totalTokens} icon={TokIcon} accent="#ec4899" loading={loading} />
            </div>

            <div className="aiu__grid">
                {/* Calls by kind */}
                <section className="aiu__card">
                    <h2 className="aiu__card-title">Calls by kind</h2>
                    {data && Object.keys(data.byKind).length > 0 ? (
                        <ul className="aiu__kinds">
                            {Object.entries(data.byKind).map(([k, v]) => (
                                <li key={k}><span>{k}</span><b>{v}</b></li>
                            ))}
                        </ul>
                    ) : <p className="aiu__empty">{loading ? "Loading…" : "No calls yet."}</p>}
                </section>

                {/* Tool usage */}
                <section className="aiu__card">
                    <h2 className="aiu__card-title">Tool usage</h2>
                    {data?.topTools?.length ? (
                        <ul className="aiu__bars">
                            {data.topTools.map((t) => (
                                <li key={t.name}>
                                    <span className="aiu__bar-label">{t.name}</span>
                                    <span className="aiu__bar-track">
                                        <span className="aiu__bar-fill" style={{ width: `${(t.count / maxTool) * 100}%` }} />
                                    </span>
                                    <span className="aiu__bar-count">{t.count}</span>
                                </li>
                            ))}
                        </ul>
                    ) : <p className="aiu__empty">{loading ? "Loading…" : "No tool calls in range."}</p>}
                </section>
            </div>

            {/* Recent calls */}
            <section className="aiu__card">
                <h2 className="aiu__card-title">Recent calls</h2>
                <div className="aiu__table-wrap">
                    <table className="aiu__table">
                        <thead>
                            <tr>
                                <th>When</th><th>Kind</th><th>Model</th><th>Query</th>
                                <th>Tools</th><th>Tokens</th><th>Latency</th><th>OK</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data?.recent?.length ? data.recent.map((r, i) => (
                                <tr key={i}>
                                    <td>{new Date(r.at).toLocaleString()}</td>
                                    <td>{r.kind}</td>
                                    <td className="aiu__mono">{r.model || "—"}</td>
                                    <td className="aiu__query" title={r.query || ""}>{r.query || "—"}</td>
                                    <td>{r.tools?.length ? r.tools.join(", ") : "—"}</td>
                                    <td>{r.tokens}</td>
                                    <td>{r.latencyMs} ms</td>
                                    <td>{r.resolved ? "✓" : "✕"}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan={8} className="aiu__empty">{loading ? "Loading…" : "No calls yet."}</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
        </div>
    );
}
