import { useEffect, useState } from "react";
import "./InventoryManager.css";

import { API } from "@/config/api";
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });

const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const SaveIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;
const AlertIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>;

const InventoryManager = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all"); // all | low | out
    const [edits, setEdits] = useState({});    // {productId_variantIdx_sizeIdx: newStock}
    const [saving, setSaving] = useState({});
    const [saved, setSaved] = useState({});

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API}/products?limit=500`, { headers: AUTH() });
            const data = await res.json();
            setProducts(data.products || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const key = (pid, vi, si) => `${pid}_${vi}_${si}`;

    const setEdit = (pid, vi, si, val) => {
        setEdits(e => ({ ...e, [key(pid, vi, si)]: Number(val) }));
    };

    const saveStock = async (product, vi, si) => {
        const k = key(product._id, vi, si);
        const val = edits[k];
        if (val === undefined) return;

        setSaving(s => ({ ...s, [k]: true }));

        // Build updated variants
        const updatedVariants = product.variants.map((v, vIdx) => ({
            ...v,
            sizes: v.sizes.map((sz, sIdx) =>
                vIdx === vi && sIdx === si ? { ...sz, stock: val } : sz
            )
        }));

        try {
            await fetch(`${API}/products/${product._id}`, {
                method: "PUT",
                headers: AUTH(),
                body: JSON.stringify({ variants: JSON.stringify(updatedVariants) }),
            });

            // optimistically update local
            setProducts(ps => ps.map(p => p._id === product._id
                ? { ...p, variants: updatedVariants } : p
            ));
            setEdits(e => { const n = { ...e }; delete n[k]; return n; });
            setSaved(s => ({ ...s, [k]: true }));
            setTimeout(() => setSaved(s => { const n = { ...s }; delete n[k]; return n; }), 2000);
        } catch (err) { console.error(err); }
        finally { setSaving(s => { const n = { ...s }; delete n[k]; return n; }); }
    };

    /* FLATTEN rows */
    const rows = [];
    products.forEach(p => {
        (p.variants || []).forEach((v, vi) => {
            (v.sizes || []).forEach((s, si) => {
                rows.push({ product: p, variant: v, vi, size: s, si });
            });
        });
    });

    const filtered = rows.filter(r => {
        const matchSearch = r.product.name.toLowerCase().includes(search.toLowerCase())
            || r.product.brand?.toLowerCase().includes(search.toLowerCase());
        const stock = r.size.stock;
        const matchFilter = filter === "all" || (filter === "low" && stock > 0 && stock <= 5) || (filter === "out" && stock === 0);
        return matchSearch && matchFilter;
    });

    const stats = {
        total: rows.length,
        low: rows.filter(r => r.size.stock > 0 && r.size.stock <= 5).length,
        out: rows.filter(r => r.size.stock === 0).length,
    };

    const img = (p) => {
        const raw = p.variants?.[0]?.images?.[0];
        return raw ? (raw.startsWith("http") ? raw : `${API}/${raw.replace(/^\//, "")}`) : null;
    };

    return (
        <div className="inv-page">

            {/* STATS */}
            <div className="inv-stats">
                <div className="inv-stat inv-stat--navy">
                    <span className="inv-stat-val">{stats.total}</span>
                    <span className="inv-stat-label">Total SKUs</span>
                </div>
                <div className="inv-stat inv-stat--amber" style={{ cursor: "pointer" }} onClick={() => setFilter("low")}>
                    <span className="inv-stat-val">{stats.low}</span>
                    <span className="inv-stat-label">Low Stock ≤5</span>
                </div>
                <div className="inv-stat inv-stat--red" style={{ cursor: "pointer" }} onClick={() => setFilter("out")}>
                    <span className="inv-stat-val">{stats.out}</span>
                    <span className="inv-stat-label">Out of Stock</span>
                </div>
                <div className="inv-stat inv-stat--green">
                    <span className="inv-stat-val">{rows.length - stats.low - stats.out}</span>
                    <span className="inv-stat-label">In Stock</span>
                </div>
            </div>

            {/* TOOLBAR */}
            <div className="inv-toolbar">
                <div className="inv-search-wrap">
                    <SearchIcon />
                    <input className="inv-search" placeholder="Search product or brand…" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <div className="inv-filters">
                    {[["all", "All"], ["low", "Low Stock"], ["out", "Out of Stock"]].map(([v, l]) => (
                        <button key={v} className={`inv-fpill ${filter === v ? "inv-fpill--active" : ""}`} onClick={() => setFilter(v)}>{l}</button>
                    ))}
                </div>
            </div>

            {/* TABLE */}
            <div className="inv-table-wrap">
                {loading ? <div className="inv-loading">Loading inventory…</div>
                    : filtered.length === 0 ? <div className="inv-empty">No SKUs found</div>
                        : (
                            <table className="inv-table">
                                <thead><tr>
                                    <th>Product</th><th>Brand</th><th>Color</th><th>Size</th><th>Stock</th><th>Status</th><th>Update</th>
                                </tr></thead>
                                <tbody>
                                    {filtered.map(({ product: p, variant: v, vi, size: s, si }) => {
                                        const k = key(p._id, vi, si);
                                        const stock = edits[k] !== undefined ? edits[k] : s.stock;
                                        const isDirty = edits[k] !== undefined;
                                        const isSaving = saving[k];
                                        const isSaved = saved[k];
                                        const src = img(p);

                                        return (
                                            <tr key={k} className={`inv-row ${s.stock === 0 ? "inv-row--out" : s.stock <= 5 ? "inv-row--low" : ""}`}>
                                                <td>
                                                    <div className="inv-product-cell">
                                                        <div className="inv-product-img">
                                                            {src ? <img src={src} alt={p.name} /> : <div className="inv-img-ph" />}
                                                        </div>
                                                        <span className="inv-product-name">{p.name}</span>
                                                    </div>
                                                </td>
                                                <td><span className="inv-brand">{p.brand}</span></td>
                                                <td>
                                                    <div className="inv-color-cell">
                                                        <span className="inv-color-dot" style={{ background: v.color || "#ccc" }} />
                                                        {v.color}
                                                    </div>
                                                </td>
                                                <td><strong>{s.size}</strong></td>
                                                <td>
                                                    <input
                                                        type="number"
                                                        className={`inv-stock-input ${isDirty ? "inv-stock-input--dirty" : ""}`}
                                                        value={stock}
                                                        min={0}
                                                        onChange={e => setEdit(p._id, vi, si, e.target.value)}
                                                        onKeyDown={e => e.key === "Enter" && saveStock(p, vi, si)}
                                                    />
                                                </td>
                                                <td>
                                                    {s.stock === 0
                                                        ? <span className="inv-badge inv-badge--out"><AlertIcon /> Out</span>
                                                        : s.stock <= 5
                                                            ? <span className="inv-badge inv-badge--low"><AlertIcon /> Low</span>
                                                            : <span className="inv-badge inv-badge--ok">In Stock</span>
                                                    }
                                                </td>
                                                <td>
                                                    {isSaved ? (
                                                        <span className="inv-saved"><SaveIcon /> Saved</span>
                                                    ) : (
                                                        <button
                                                            className={`inv-save-btn ${!isDirty ? "inv-save-btn--dim" : ""}`}
                                                            onClick={() => saveStock(p, vi, si)}
                                                            disabled={!isDirty || isSaving}
                                                        >
                                                            {isSaving ? "…" : "Save"}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        )}
            </div>
        </div>
    );
};

export default InventoryManager;