import { useState, useEffect } from "react";
import "./AdminProducts.css";

import { API } from "@/config/api";
const PROD_URL = `${API}/api/products`;
const CAT_URL = `${API}/api/categories`;
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}` });

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "6", "7", "8", "9", "10", "11", "One Size"];

const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const EditIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const CloseIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>;

const emptyForm = () => ({ name: "", price: "", brand: "", category: "", description: "", newArrival: false, featured: false, trending: false });
const emptyVariant = () => ({ color: "#ff6b3d", colorName: "", images: [], sizes: [{ size: "", stock: 0 }] });

const AdminProducts = () => {
    const [products, setProducts] = useState([]);
    const [categories, setCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [search, setSearch] = useState("");
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [variants, setVariants] = useState([emptyVariant()]);
    const [tab, setTab] = useState("info");
    const [error, setError] = useState("");   // ← shows inline error instead of alert

    /* ── load products + categories ── */
    const load = async () => {
        setLoading(true);
        try {
            const [pr, cr] = await Promise.all([
                fetch(`${PROD_URL}?limit=200`, { headers: AUTH() }),
                fetch(CAT_URL),
            ]);
            const pd = await pr.json();
            const cd = await cr.json();
            setProducts(pd.products || []);
            setCats(cd.categories || cd || []);
        } catch (e) {
            console.error("Load error:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const setF = (k, v) => setForm(f => ({ ...f, [k]: v }));

    /* ── variant helpers ── */
    const setVr = (i, k, v) => setVariants(vs => vs.map((x, j) => j === i ? { ...x, [k]: v } : x));
    const addVr = () => setVariants(vs => [...vs, emptyVariant()]);
    const remVr = (i) => setVariants(vs => vs.filter((_, j) => j !== i));
    const addSz = (vi) => setVariants(vs => vs.map((v, i) => i === vi ? { ...v, sizes: [...v.sizes, { size: "", stock: 0 }] } : v));
    const remSz = (vi, si) => setVariants(vs => vs.map((v, i) => i === vi ? { ...v, sizes: v.sizes.filter((_, j) => j !== si) } : v));
    const setSz = (vi, si, k, val) => setVariants(vs => vs.map((v, i) => i === vi ? { ...v, sizes: v.sizes.map((s, j) => j === si ? { ...s, [k]: k === "stock" ? Number(val) : val } : s) } : v));
    const addPreset = (vi, s) => setVariants(vs => vs.map((v, i) => i === vi && !v.sizes.find(x => x.size === s) ? { ...v, sizes: [...v.sizes, { size: s, stock: 0 }] } : v));

    const addImgs = (vi, files) => {
        const imgs = Array.from(files).map(f => ({ file: f, preview: URL.createObjectURL(f) }));
        setVariants(vs => vs.map((v, i) => i === vi ? { ...v, images: [...v.images, ...imgs] } : v));
    };
    const remImg = (vi, ii) => setVariants(vs => vs.map((v, i) => i === vi ? { ...v, images: v.images.filter((_, j) => j !== ii) } : v));

    /* ── open edit panel ── */
    const openEdit = (p) => {
        setEditingId(p._id);
        setError("");
        setForm({
            name: p.name,
            price: p.price,
            brand: p.brand,
            /* ✅ handle both populated object and plain string */
            category: p.category?._id || p.category || "",
            description: p.description || "",
            newArrival: !!p.newArrival,
            featured: !!p.featured,
            trending: !!p.trending,
        });
        setVariants(
            (p.variants || []).map(v => ({
                color: v.color || "#ff6b3d",
                colorName: v.color || "",
                /* ✅ convert existing URL strings into {url, preview} objects
                   so they show in the thumbnail grid and get preserved on save */
                images: (v.images || []).map(url =>
                    typeof url === "string"
                        ? { url, preview: url.startsWith("http") ? url : `${API}/${url.replace(/^\//, "")}` }
                        : url
                ),
                sizes: v.sizes || [],
            }))
        );
        setTab("info");
        setPanelOpen(true);
    };

    const openNew = () => {
        setEditingId(null);
        setError("");
        setForm(emptyForm());
        setVariants([emptyVariant()]);
        setTab("info");
        setPanelOpen(true);
    };

    const close = () => { setPanelOpen(false); setEditingId(null); setError(""); };

    const handleDelete = async (id) => {
        if (!window.confirm("Delete this product?")) return;
        try {
            await fetch(`${PROD_URL}/${id}`, { method: "DELETE", headers: AUTH() });
            load();
        } catch (e) {
            console.error("Delete error:", e);
        }
    };

    /* ── submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.name.trim()) return setError("Product name is required");
        if (!form.brand.trim()) return setError("Brand is required");
        if (!form.price) return setError("Price is required");
        if (!form.category) return setError("Please select a category");

        const hasValidVariant = variants.some(v =>
            (v.colorName?.trim() || v.color?.trim()) &&
            v.sizes.some(s => s.size?.trim())
        );

        if (!hasValidVariant) {
            return setError("Add at least one variant with color and size");
        }

        setSaving(true);

        try {
            const fd = new FormData();

            fd.append("name", form.name.trim());
            fd.append("brand", form.brand.trim());
            fd.append("price", form.price);
            fd.append("category", form.category);
            fd.append("description", form.description || "");

            // 🔥 IMPORTANT FIX (boolean → string)
            fd.append("newArrival", String(form.newArrival));
            fd.append("featured", String(form.featured));
            fd.append("trending", String(form.trending));

            fd.append("variants", JSON.stringify(
                variants.map(v => ({
                    color: v.colorName?.trim() || v.color,
                    colorName: v.colorName?.trim() || v.color,
                    sizes: v.sizes.filter(s => s.size?.trim()),
                }))
            ));

            variants.forEach((v, i) => {
                v.images.forEach(img => {
                    if (img.file instanceof File) {
                        fd.append(`variantImages_${i}`, img.file);
                    }
                });
            });

            console.log("📤 FormData:");
            for (const [k, v] of fd.entries()) {
                console.log(k, v instanceof File ? `File(${v.name})` : v);
            }

            const method = editingId ? "PUT" : "POST";
            const url = editingId ? `${PROD_URL}/${editingId}` : PROD_URL;

            const res = await fetch(url, {
                method,
                headers: AUTH(),
                body: fd
            });

            let data;

            // 🔥 CRITICAL FIX (avoid crash)
            try {
                data = await res.json();
            } catch (err) {
                const text = await res.text();
                console.error("❌ Non-JSON response:", text);
                setError("Server crashed — check backend");
                return;
            }

            if (!res.ok) {
                console.error("❌ Server error:", data);
                setError(data?.message || data?.error || `Error ${res.status}`);
                return;
            }

            console.log("✅ Product saved:", data._id);

            close();
            load();

        } catch (err) {
            console.error("❌ Network error:", err);
            setError("Network error — backend not reachable");
        } finally {
            setSaving(false);
        }
    };

    const filtered = products.filter(p =>
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.brand?.toLowerCase().includes(search.toLowerCase())
    );

    const thumbSrc = (p) => {
        const img = p.variants?.[0]?.images?.[0];
        if (!img) return null;
        return typeof img === "string" && img.startsWith("http")
            ? img
            : `${API}/${String(img).replace(/^\//, "")}`;
    };

    /* ════════════════════════════
       RENDER
    ════════════════════════════ */
    return (
        <div className="ap-page">

            {/* TOOLBAR */}
            <div className="ap-toolbar">
                <div className="ap-search-wrap">
                    <SearchIcon />
                    <input
                        className="ap-search"
                        placeholder="Search products…"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                    {search && <button className="ap-search-clear" onClick={() => setSearch("")}><CloseIcon /></button>}
                </div>
                <button className="ap-add-btn" onClick={openNew}><PlusIcon /> Add Product</button>
            </div>

            <div className="ap-meta">
                <span>{filtered.length} product{filtered.length !== 1 ? "s" : ""}</span>
                {categories.length === 0 && <span className="ap-warn">⚠ No categories — add one first</span>}
            </div>

            {/* TABLE */}
            <div className="ap-table-wrap">
                {loading ? (
                    <div className="ap-loading">Loading…</div>
                ) : filtered.length === 0 ? (
                    <div className="ap-empty">No products found</div>
                ) : (
                    <table className="ap-table">
                        <thead>
                            <tr>
                                <th>Product</th><th>Category</th><th>Price</th>
                                <th>Variants</th><th>Flags</th><th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(p => {
                                const src = thumbSrc(p);
                                return (
                                    <tr key={p._id}>
                                        <td>
                                            <div className="ap-product-cell">
                                                <div className="ap-product-img">
                                                    {src ? <img src={src} alt={p.name} /> : <div className="ap-img-ph" />}
                                                </div>
                                                <div>
                                                    <span className="ap-product-name">{p.name}</span>
                                                    <span className="ap-product-brand">{p.brand}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td><span className="ap-cat-badge">{p.category}</span></td>
                                        <td><strong>₹{p.price?.toLocaleString("en-IN")}</strong></td>
                                        <td>{p.variants?.length || 0} color{p.variants?.length !== 1 ? "s" : ""}</td>
                                        <td>
                                            <div className="ap-flags">
                                                {p.featured && <span className="ap-flag ap-flag--featured">Featured</span>}
                                                {p.trending && <span className="ap-flag ap-flag--trending">Trending</span>}
                                                {p.newArrival && <span className="ap-flag ap-flag--new">New</span>}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="ap-row-actions">
                                                <button className="ap-edit-btn" onClick={() => openEdit(p)}><EditIcon /> Edit</button>
                                                <button className="ap-del-btn" onClick={() => handleDelete(p._id)}><TrashIcon /></button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* SLIDE PANEL */}
            {panelOpen && (
                <>
                    <div className="ap-overlay" onClick={close} />
                    <div className="ap-panel">
                        <div className="ap-panel-header">
                            <h2>{editingId ? "Edit Product" : "New Product"}</h2>
                            <button className="ap-panel-close" onClick={close}><CloseIcon /></button>
                        </div>

                        <div className="ap-tabs">
                            {["info", "variants", "flags"].map(t => (
                                <button
                                    key={t}
                                    className={`ap-tab ${tab === t ? "ap-tab--active" : ""}`}
                                    onClick={() => setTab(t)}
                                >
                                    {t.charAt(0).toUpperCase() + t.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* ── inline error banner ── */}
                        {error && (
                            <div className="ap-error-banner">
                                ⚠ {error}
                            </div>
                        )}

                        <form className="ap-form" onSubmit={handleSubmit}>

                            {/* INFO TAB */}
                            {tab === "info" && (
                                <div className="ap-tab-body">
                                    <div className="ap-field-row">
                                        <div className="ap-field">
                                            <label>Product Name *</label>
                                            <input value={form.name} onChange={e => setF("name", e.target.value)} placeholder="e.g. Steelbird SBH-40" required />
                                        </div>
                                        <div className="ap-field">
                                            <label>Brand *</label>
                                            <input value={form.brand} onChange={e => setF("brand", e.target.value)} placeholder="e.g. Steelbird" required />
                                        </div>
                                    </div>
                                    <div className="ap-field-row">
                                        <div className="ap-field">
                                            <label>Price (₹) *</label>
                                            <input type="number" value={form.price} onChange={e => setF("price", e.target.value)} placeholder="2499" min="0" required />
                                        </div>
                                        <div className="ap-field">
                                            <label>Category *</label>
                                            <select value={form.category} onChange={e => setF("category", e.target.value)} required>
                                                <option value="">Select category</option>
                                                {categories.map(c => (
                                                    <option key={c._id} value={c._id}>{c.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="ap-field">
                                        <label>Description</label>
                                        <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={4} placeholder="Product description…" />
                                    </div>
                                </div>
                            )}

                            {/* VARIANTS TAB */}
                            {tab === "variants" && (
                                <div className="ap-tab-body">
                                    {variants.map((v, vi) => (
                                        <div className="ap-variant-card" key={vi}>
                                            <div className="ap-variant-header">
                                                <span>Variant {vi + 1}</span>
                                                {variants.length > 1 && (
                                                    <button type="button" className="ap-del-sm" onClick={() => remVr(vi)}><TrashIcon /></button>
                                                )}
                                            </div>

                                            <div className="ap-field-row">
                                                <div className="ap-field">
                                                    <label>Color Name *</label>
                                                    <input
                                                        value={v.colorName}
                                                        onChange={e => setVr(vi, "colorName", e.target.value)}
                                                        placeholder="e.g. Matte Black"
                                                    />
                                                </div>
                                                <div className="ap-field ap-field--color">
                                                    <label>Swatch</label>
                                                    <input type="color" value={v.color} onChange={e => setVr(vi, "color", e.target.value)} />
                                                </div>
                                            </div>

                                            <div className="ap-field">
                                                <label>Images</label>
                                                <label className="ap-img-upload">
                                                    <PlusIcon /> Add Images
                                                    <input type="file" multiple accept="image/*" hidden onChange={e => addImgs(vi, e.target.files)} />
                                                </label>
                                                {v.images.length > 0 && (
                                                    <div className="ap-img-grid">
                                                        {v.images.map((img, ii) => {
                                                            const src = img.preview
                                                                || img.url
                                                                || (typeof img === "string"
                                                                    ? (img.startsWith("http") ? img : `${API}/${img.replace(/^\//, "")}`)
                                                                    : "#");
                                                            return (
                                                                <div className="ap-img-thumb" key={ii}>
                                                                    <img src={src} alt="" />
                                                                    <button type="button" onClick={() => remImg(vi, ii)}><CloseIcon /></button>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>

                                            <div className="ap-field">
                                                <label>Sizes & Stock</label>
                                                <div className="ap-size-presets">
                                                    {SIZE_PRESETS.map(s => (
                                                        <button
                                                            type="button" key={s}
                                                            className={`ap-size-preset ${v.sizes.find(x => x.size === s) ? "ap-size-preset--active" : ""}`}
                                                            onClick={() => addPreset(vi, s)}
                                                        >{s}</button>
                                                    ))}
                                                </div>
                                                <div className="ap-sizes">
                                                    {v.sizes.map((s, si) => (
                                                        <div className="ap-size-row" key={si}>
                                                            <input value={s.size} onChange={e => setSz(vi, si, "size", e.target.value)} placeholder="Size" className="ap-size-input" />
                                                            <input type="number" value={s.stock} onChange={e => setSz(vi, si, "stock", e.target.value)} placeholder="Stock" className="ap-stock-input" min={0} />
                                                            <button type="button" className="ap-del-sm" onClick={() => remSz(vi, si)}><TrashIcon /></button>
                                                        </div>
                                                    ))}
                                                    <button type="button" className="ap-add-size-btn" onClick={() => addSz(vi)}><PlusIcon /> Add Size</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    <button type="button" className="ap-add-variant-btn" onClick={addVr}><PlusIcon /> Add Variant</button>
                                </div>
                            )}

                            {/* FLAGS TAB */}
                            {tab === "flags" && (
                                <div className="ap-tab-body">
                                    <p className="ap-flags-hint">Control where this product appears on the homepage.</p>
                                    {[
                                        { key: "featured", label: "Featured", desc: "Shows in the Featured bento grid" },
                                        { key: "trending", label: "Trending", desc: "Shows in the Trending Products slider" },
                                        { key: "newArrival", label: "New Arrival", desc: "Shows in New Arrivals (auto-expires 7 days)" },
                                    ].map(({ key, label, desc }) => (
                                        <label className="ap-toggle-row" key={key}>
                                            <div>
                                                <span className="ap-toggle-label">{label}</span>
                                                <span className="ap-toggle-desc">{desc}</span>
                                            </div>
                                            <div
                                                className={`ap-toggle ${form[key] ? "ap-toggle--on" : ""}`}
                                                onClick={() => setF(key, !form[key])}
                                            >
                                                <div className="ap-toggle-knob" />
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            )}

                            <div className="ap-panel-footer">
                                <button type="button" className="ap-cancel-btn" onClick={close}>Cancel</button>
                                <button
                                    type="submit"
                                    className={`ap-save-btn ${saving ? "ap-save-btn--loading" : ""}`}
                                    disabled={saving}
                                >
                                    {saving ? "Saving…" : editingId ? "Update Product" : "Create Product"}
                                </button>
                            </div>
                        </form>
                    </div>
                </>
            )}
        </div>
    );
};

export default AdminProducts;