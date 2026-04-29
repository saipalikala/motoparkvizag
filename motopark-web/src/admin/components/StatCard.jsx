import { memo, useEffect, useRef, useState } from "react";
import "./StatCard.css";

/* ── Animated counter — no external library ── */
function useCountUp(end, duration = 1200, enabled = true) {
    const [val, setVal] = useState(0);
    const rafRef = useRef(null);

    useEffect(() => {
        if (!enabled || end === undefined) return;
        const start = performance.now();
        const from = 0;

        const tick = (now) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setVal(Math.round(from + (end - from) * eased));
            if (progress < 1) rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, [end, duration, enabled]);

    return val;
}

/* ── Trend arrow ── */
const TrendArrow = memo(({ dir }) => (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round"
        strokeLinejoin="round" aria-hidden="true">
        {dir === "up"
            ? <><polyline points="2,7 5,3 8,7"/></>
            : <><polyline points="2,3 5,7 8,3"/></>
        }
    </svg>
));
TrendArrow.displayName = "TrendArrow";

/* ================================================================
   STAT CARD
   Props:
     title         string       — KPI label
     value         number       — raw value
     prefix        string?      — e.g. "₹" or "$"
     suffix        string?      — e.g. "%" or " orders"
     delta         number?      — e.g. 12.4 (positive = up, negative = down)
     deltaLabel    string?      — e.g. "vs last month"
     icon          ReactNode?   — icon component
     accent        string?      — CSS color for icon bg tint
     loading       boolean?     — show skeleton
     animate       boolean?     — count-up on mount (default: true)
     formatter     fn?          — custom value formatter (v) => string
   ================================================================ */
const StatCard = memo(({
    title,
    value,
    prefix = "",
    suffix = "",
    delta,
    deltaLabel = "vs last month",
    icon: Icon,
    accent,
    loading = false,
    animate = true,
    formatter,
}) => {
    const counted = useCountUp(
        typeof value === "number" ? value : 0,
        1100,
        animate && !loading && typeof value === "number"
    );

    const displayVal = formatter
        ? formatter(animate ? counted : value)
        : (animate ? counted : value);

    const hasDelta = delta !== undefined && delta !== null;
    const isUp     = hasDelta && delta >= 0;

    return (
        <div className={`stat-card${loading ? " stat-card--loading" : ""}`} role="article">
            {/* Top row: icon + delta */}
            <div className="stat-card__top">
                {Icon && (
                    <div
                        className="stat-card__icon"
                        style={accent ? { background: `${accent}18`, color: accent } : {}}
                        aria-hidden="true"
                    >
                        <Icon />
                    </div>
                )}

                {hasDelta && !loading && (
                    <div
                        className={`stat-card__delta stat-card__delta--${isUp ? "up" : "down"}`}
                        aria-label={`${isUp ? "Up" : "Down"} ${Math.abs(delta).toFixed(1)}% ${deltaLabel}`}
                    >
                        <TrendArrow dir={isUp ? "up" : "down"} />
                        <span>{Math.abs(delta).toFixed(1)}%</span>
                    </div>
                )}
            </div>

            {/* Value */}
            {loading ? (
                <div className="stat-card__skel-value" aria-hidden="true" />
            ) : (
                <div className="stat-card__value" aria-live="polite">
                    {prefix && <span className="stat-card__prefix">{prefix}</span>}
                    <span>{displayVal?.toLocaleString?.() ?? displayVal}</span>
                    {suffix && <span className="stat-card__suffix">{suffix}</span>}
                </div>
            )}

            {/* Label */}
            {loading ? (
                <div className="stat-card__skel-label" aria-hidden="true" />
            ) : (
                <div className="stat-card__label">{title}</div>
            )}

            {/* Delta context */}
            {hasDelta && !loading && (
                <div className="stat-card__delta-label">{deltaLabel}</div>
            )}
        </div>
    );
});

StatCard.displayName = "StatCard";
export default StatCard;