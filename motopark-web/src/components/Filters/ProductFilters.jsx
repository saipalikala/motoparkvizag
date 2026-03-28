import { useEffect, useState } from "react";
import "./ProductFilters.css";

// const API = "http://localhost:5000/api/products/filters";
import { API } from "@/config/api"; // ✅ ADDED

// ✅ Correct API URL
const FILTER_API = `${API}/products/filters`;
const ChevronIcon = ({ open }) => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
        style={{ transform: open ? "rotate(180deg)" : "rotate(0)", transition: "transform .2s" }}>
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

const FilterSection = ({ title, children, defaultOpen = true, count = 0 }) => {
    const [open, setOpen] = useState(defaultOpen);
    return (
        <div className="pf-section">
            <button className="pf-section-header" onClick={() => setOpen(o => !o)}>
                <span className="pf-section-title">
                    {title}
                    {count > 0 && <span className="pf-active-dot" />}
                </span>
                <ChevronIcon open={open} />
            </button>
            {open && <div className="pf-section-body">{children}</div>}
        </div>
    );
};

const colorFromName = (name) => {
    if (!name) return "#e8e8e8";
    if (name.startsWith("#") || name.startsWith("rgb")) return name;
    const map = {
        black: "#1a1a1a", white: "#f5f5f5", red: "#ef4444", blue: "#3b82f6",
        green: "#22c55e", yellow: "#eab308", orange: "#f97316", purple: "#a855f7",
        pink: "#ec4899", grey: "#6b7280", gray: "#6b7280", silver: "#c0c0c0",
        brown: "#a16207", gold: "#ca8a04", navy: "#1e3a5f", maroon: "#7f1d1d",
        "matte black": "#1a1a1a", "gloss black": "#000", "pearl white": "#f9f9f9",
    };
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(map)) { if (lower.includes(k)) return v; }
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return `hsl(${Math.abs(hash) % 360}, 55%, 50%)`;
};

const ProductFilters = ({ onChange, category }) => {
    const [filters, setFilters] = useState({ brands: [], sizes: [], colors: [], priceRange: { min: 0, max: 10000 } });
    const [selected, setSelected] = useState({ brand: [], size: [], color: [], minPrice: "", maxPrice: "" });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!category) return;
        setLoading(true);
        setSelected({ brand: [], size: [], color: [], minPrice: "", maxPrice: "" });
        fetch(`${FILTER_API}?category=${encodeURIComponent(category)}`)
            .then(r => r.json())
            .then(data => setFilters({
                brands: data.brands || [],
                sizes: data.sizes || [],
                colors: data.colors || [],
                priceRange: data.priceRange || { min: 0, max: 10000 },
            }))
            .catch(console.error)
            .finally(() => setLoading(false));
    }, [category]);

    useEffect(() => {
        const q = {};
        if (selected.brand.length) q.brand = selected.brand.join(",");
        if (selected.size.length) q.size = selected.size[0];
        if (selected.color.length) q.color = selected.color.join(",");
        if (selected.minPrice) q.minPrice = selected.minPrice;
        if (selected.maxPrice) q.maxPrice = selected.maxPrice;
        onChange(q);
    }, [selected]);

    const toggle = (key, value) => setSelected(s => ({
        ...s, [key]: s[key].includes(value) ? s[key].filter(v => v !== value) : [...s[key], value]
    }));

    const clearAll = () => setSelected({ brand: [], size: [], color: [], minPrice: "", maxPrice: "" });

    const activeCount = selected.brand.length + selected.size.length + selected.color.length
        + (selected.minPrice ? 1 : 0) + (selected.maxPrice ? 1 : 0);

    if (loading) return (
        <div className="pf-loading">
            {[1, 2, 3, 4].map(i => <div key={i} className="pf-skel" />)}
        </div>
    );

    return (
        <div className="pf-wrap">
            <div className="pf-header">
                {activeCount > 0 ? (
                    <button className="pf-clear" onClick={clearAll}>
                        Clear All <span className="pf-clear-count">{activeCount}</span>
                    </button>
                ) : (
                    <p className="pf-no-filters">
                        {filters.brands.length === 0 && filters.sizes.length === 0 && filters.colors.length === 0
                            ? "No filters available" : "No filters applied"}
                    </p>
                )}
            </div>

            {filters.brands.length > 0 && (
                <FilterSection title="Brand" count={selected.brand.length}>
                    <div className="pf-check-list">
                        {filters.brands.map(brand => (
                            <label key={brand} className="pf-check-row" onClick={() => toggle("brand", brand)}>
                                <div className={`pf-checkbox ${selected.brand.includes(brand) ? "pf-checkbox--checked" : ""}`}>
                                    {selected.brand.includes(brand) && (
                                        <svg width="9" height="9" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round"><path d="M2 6l3 3 5-5" /></svg>
                                    )}
                                </div>
                                <span className="pf-check-label">{brand}</span>
                            </label>
                        ))}
                    </div>
                </FilterSection>
            )}

            {filters.sizes.length > 0 && (
                <FilterSection title="Size" count={selected.size.length}>
                    <div className="pf-size-grid">
                        {filters.sizes.map(size => (
                            <button key={size} className={`pf-size-pill ${selected.size.includes(size) ? "pf-size-pill--active" : ""}`} onClick={() => toggle("size", size)}>
                                {size}
                            </button>
                        ))}
                    </div>
                </FilterSection>
            )}

            {filters.colors.length > 0 && (
                <FilterSection title="Color" count={selected.color.length}>
                    <div className="pf-color-list">
                        {filters.colors.map(color => {
                            const bg = colorFromName(color);
                            const active = selected.color.includes(color);
                            return (
                                <button key={color} className={`pf-color-row ${active ? "pf-color-row--active" : ""}`} onClick={() => toggle("color", color)} title={color}>
                                    <span className="pf-color-swatch" style={{ background: bg, border: (bg === "#f5f5f5" || bg === "#f9f9f9") ? "1px solid #e0e0e0" : "none" }}>
                                        {active && <svg width="8" height="8" viewBox="0 0 12 12" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M2 6l3 3 5-5" /></svg>}
                                    </span>
                                    <span className="pf-color-name">{color}</span>
                                </button>
                            );
                        })}
                    </div>
                </FilterSection>
            )}

            <FilterSection title="Price Range" defaultOpen={false} count={(selected.minPrice || selected.maxPrice) ? 1 : 0}>
                <div className="pf-price-row">
                    <div className="pf-price-field">
                        <span className="pf-price-symbol">₹</span>
                        <input type="number" className="pf-price-input" placeholder={String(filters.priceRange?.min || 0)} value={selected.minPrice} min={0} onChange={e => setSelected(s => ({ ...s, minPrice: e.target.value }))} />
                    </div>
                    <span className="pf-price-sep">to</span>
                    <div className="pf-price-field">
                        <span className="pf-price-symbol">₹</span>
                        <input type="number" className="pf-price-input" placeholder={String(filters.priceRange?.max || 10000)} value={selected.maxPrice} min={0} onChange={e => setSelected(s => ({ ...s, maxPrice: e.target.value }))} />
                    </div>
                </div>
                {(selected.minPrice || selected.maxPrice) && (
                    <p className="pf-price-applied">₹{selected.minPrice || filters.priceRange?.min} – ₹{selected.maxPrice || filters.priceRange?.max}</p>
                )}
            </FilterSection>
        </div>
    );
};

export default ProductFilters;