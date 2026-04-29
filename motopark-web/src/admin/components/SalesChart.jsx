import { useState, useEffect, memo } from "react";
import {
    AreaChart, Area,
    XAxis, YAxis,
    Tooltip, ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import { API } from "@/config/api";
import "./SalesChart.css";

/* ── Fallback data (shown while loading or on error) ── */
const PLACEHOLDER = [
    { day: "1",  sales: 0 },
    { day: "7",  sales: 0 },
    { day: "14", sales: 0 },
    { day: "21", sales: 0 },
    { day: "28", sales: 0 },
    { day: "30", sales: 0 },
];

/* ── Custom tooltip ── */
const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="chart-tooltip">
            <div className="chart-tooltip__label">{label}</div>
            <div className="chart-tooltip__value">
                ₹{Number(payload[0]?.value ?? 0).toLocaleString("en-IN")}
            </div>
        </div>
    );
};

/* ── Skeleton ── */
const ChartSkeleton = () => (
    <div className="chart-skeleton" aria-hidden="true">
        {[80, 55, 70, 45, 90, 60, 75, 40, 85, 65].map((h, i) => (
            <div key={i} className="chart-skeleton__bar" style={{ height: `${h}%` }} />
        ))}
    </div>
);

/* ================================================================
   SALES CHART
   Props:
     period   "7d" | "30d" | "90d"  — passed down from Dashboard
   ================================================================ */
const SalesChart = memo(({ period = "30d" }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem("adminToken");
        setLoading(true);
        setError(false);

        fetch(`${API}/admin/sales-chart?period=${period}`, {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((r) => (r.ok ? r.json() : Promise.reject()))
            .then((d) => {
                // Normalise: accept { day, sales } or { date, revenue } shapes
                const normalised = Array.isArray(d)
                    ? d.map((row) => ({
                          day:   row.day   ?? row.date ?? row.label ?? "?",
                          sales: row.sales ?? row.revenue ?? row.amount ?? 0,
                      }))
                    : [];
                setData(normalised.length ? normalised : PLACEHOLDER);
            })
            .catch(() => {
                setError(true);
                setData(PLACEHOLDER);
            })
            .finally(() => setLoading(false));
    }, [period]);

    /* Max Y for domain */
    const maxVal = data.reduce((m, d) => Math.max(m, d.sales), 0);
    const yMax   = maxVal > 0 ? Math.ceil(maxVal * 1.15 / 1000) * 1000 : 10000;

    if (loading) return <ChartSkeleton />;

    return (
        <div className="sales-chart" aria-label="Sales trend chart">
            {error && (
                <div className="chart-notice">Could not load live data — showing placeholder.</div>
            )}
            <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={data} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"   stopColor="#ff6b3d" stopOpacity={0.18} />
                            <stop offset="100%" stopColor="#ff6b3d" stopOpacity={0.0}  />
                        </linearGradient>
                    </defs>

                    <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="rgba(11,29,58,0.05)"
                        vertical={false}
                    />

                    <XAxis
                        dataKey="day"
                        tick={{ fontSize: 11, fill: "#9ca3af", fontFamily: "DM Sans, sans-serif" }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                    />

                    <YAxis
                        domain={[0, yMax]}
                        tick={{ fontSize: 10, fill: "#9ca3af", fontFamily: "DM Sans, sans-serif" }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => v >= 1000 ? `${v / 1000}k` : v}
                        width={40}
                    />

                    <Tooltip
                        content={<CustomTooltip />}
                        cursor={{ stroke: "rgba(255,107,61,0.15)", strokeWidth: 1 }}
                    />

                    <Area
                        type="monotone"
                        dataKey="sales"
                        stroke="#ff6b3d"
                        strokeWidth={2.5}
                        fill="url(#chartGrad)"
                        dot={false}
                        activeDot={{
                            r: 4,
                            fill: "#ff6b3d",
                            stroke: "#fff",
                            strokeWidth: 2,
                        }}
                        animationDuration={800}
                        animationEasing="ease-out"
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
});

SalesChart.displayName = "SalesChart";
export default SalesChart;