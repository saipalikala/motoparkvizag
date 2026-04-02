import { useState, useEffect } from "react";
import "./AdminProducts.css";

import { API } from "@/config/api";
const PROD_URL = `${API}/products`;
const CAT_URL = `${API}/categories`;
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}` });

const SIZE_PRESETS = ["XS", "S", "M", "L", "XL", "XXL", "Free Size", "6", "7", "8", "9", "10", "11", "One Size", "Standard"];

const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const EditIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const CloseIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>;
const UploadIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>;
const DownloadIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" /></svg>;

const emptyForm = () => ({
    name: "", price: "", brand: "", category: "",
    description: "", newArrival: false, featured: false, trending: false,
    productType: "variable",
    stock: 0,
});
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
    const [error, setError] = useState("");
    const [bulkStatus, setBulkStatus] = useState(""); // ✅ bulk upload feedback

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
            category: p.category?._id || p.category || "",
            description: p.description || "",
            newArrival: !!p.newArrival,
            featured: !!p.featured,
            trending: !!p.trending,
            productType: "variable",
            stock: 0,
        });
        setVariants(
            (p.variants || []).map(v => ({
                color: v.color || "#ff6b3d",
                colorName: v.color || "",
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

    /* ── bulk CSV upload ── */
    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setBulkStatus("Uploading…");

        const fd = new FormData();
        fd.append("csv", file);

        try {
            const res = await fetch(`${PROD_URL}/bulk`, {
                method: "POST",
                headers: AUTH(),
                body: fd,
            });
            const data = await res.json();
            if (res.ok) {
                setBulkStatus(`✅ ${data.message}`);
                load();
            } else {
                setBulkStatus(`❌ ${data.message}`);
            }
        } catch (err) {
            setBulkStatus("❌ Upload failed — check connection");
        }

        // clear status after 5 seconds
        setTimeout(() => setBulkStatus(""), 5000);
        e.target.value = "";
    };

    /* ── download CSV template ── */
    const downloadTemplate = () => {
        const header = "name,brand,price,category,description,color,sizes,featured,trending,newArrival";
        const example = "Steelbird SBH-40,Steelbird,2499,Helmets,Premium full-face helmet,Matte Black,S:10|M:20|L:15,false,false,true";
        const example2 = "Phone Mount Pro,Generic,599,Accessories,Universal phone holder,,Standard:50,false,false,false";
        const csv = [header, example, example2].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "motopark_bulk_template.csv";
        a.click();
        URL.revokeObjectURL(url);
    };

    /* ── submit ── */
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.name.trim()) return setError("Product name is required");
        if (!form.brand.trim()) return setError("Brand is required");
        if (!form.price) return setError("Price is required");
        if (!form.category) return setError("Please select a category");

        // Simple product validation
        if (form.productType === "simple") {
            if (!form.stock && form.stock !== 0) {
                return setError("Stock quantity is required");
            }
            // Simple products don't need variant image validation
        } else {
            // Variable product validation
            if (variants.length === 0) {
                return setError("Add at least one variant");
            }

            // ✅ Every variant must have at least one image
            const missingImage = variants.findIndex(v => v.images.length === 0);
            if (missingImage !== -1) {
                setTab("variants");
                return setError(`Variant ${missingImage + 1} needs at least one image`);
            }
        }

        // ✅ Auto-fix sizes — add Standard if none provided
        const fixedVariants = variants.map(v => ({
            ...v,
            sizes: v.sizes.filter(s => s.size?.trim()).length > 0
                ? v.sizes.filter(s => s.size?.trim())
                : [{ size: "Standard", stock: 0 }]
        }));

        setSaving(true);

        try {
            const fd = new FormData();

            fd.append("name", form.name.trim());
            fd.append("brand", form.brand.trim());
            fd.append("price", form.price);
            fd.append("category", form.category);
            fd.append("description", form.description || "");
            fd.append("newArrival", String(form.newArrival));
            fd.append("featured", String(form.featured));
            fd.append("trending", String(form.trending));

            // ✅ Simple vs variable product data
            if (form.productType === "simple") {
                fd.append("variants", JSON.stringify([{
                    color: "Default",
                    colorName: "",
                    sizes: [{ size: "Standard", stock: Number(form.stock) }],
                }]));
                // No image files for simple — images added via edit later
            } else {
                fd.append("variants", JSON.stringify(
                    fixedVariants.map(v => ({
                        color: v.colorName?.trim() || v.color || "",
                        colorName: v.colorName?.trim() || "",
                        sizes: v.sizes,
                    }))
                ));

                // Attach image files
                fixedVariants.forEach((v, i) => {
                    v.images.forEach(img => {
                        if (img.file instanceof File) {
                            fd.append(`variantImages_${i}`, img.file);
                        }
                    });
                });
            }

            console.log("📤 FormData:");
            for (const [k, v] of fd.entries()) {
                console.log(k, v instanceof File ? `File(${v.name})` : v);
            }

            const method = editingId ? "PUT" : "POST";
            const url = editingId ? `${PROD_URL}/${editingId}` : PROD_URL;

            const res = await fetch(url, {
                method,
                headers: AUTH(),
                body: fd,
            });

            let data;
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

                <div className="ap-toolbar-actions">
                    {/* ✅ Download CSV template */}
                    <button className="ap-template-btn" onClick={downloadTemplate} title="Download CSV template">
                        <DownloadIcon /> Template
                    </button>

                    {/* ✅ Bulk upload CSV */}
                    <label className="ap-bulk-btn" title="Bulk upload via CSV">
                        <UploadIcon /> Bulk Upload
                        <input type="file" accept=".csv" hidden onChange={handleBulkUpload} />
                    </label>

                    <button className="ap-add-btn" onClick={openNew}><PlusIcon /> Add Product</button>
                </div>
            </div>

            {/* ✅ Bulk upload status message */}
            {bulkStatus && (
                <div className={`ap-bulk-status ${bulkStatus.startsWith("✅") ? "ap-bulk-status--ok" : bulkStatus.startsWith("❌") ? "ap-bulk-status--err" : ""}`}>
                    {bulkStatus}
                </div>
            )}

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
                                        <td>{p.variants?.length || 0} variant{p.variants?.length !== 1 ? "s" : ""}</td>
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

                        {/* ✅ Hide variants tab for simple products */}
                        <div className="ap-tabs">
                            {["info", form.productType === "variable" ? "variants" : null, "flags"]
                                .filter(Boolean)
                                .map(t => (
                                    <button
                                        key={t}
                                        className={`ap-tab ${tab === t ? "ap-tab--active" : ""}`}
                                        onClick={() => setTab(t)}
                                    >
                                        {t.charAt(0).toUpperCase() + t.slice(1)}
                                    </button>
                                ))}
                        </div>

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

                                    {/* ✅ PRODUCT TYPE TOGGLE */}
                                    <div className="ap-field">
                                        <label>Product Type</label>
                                        <div className="ap-type-toggle">
                                            <button
                                                type="button"
                                                className={`ap-type-btn ${form.productType === "simple" ? "ap-type-btn--active" : ""}`}
                                                onClick={() => { setF("productType", "simple"); setTab("info"); }}
                                            >
                                                Simple
                                                <span>No variants — just stock &amp; image</span>
                                            </button>
                                            <button
                                                type="button"
                                                className={`ap-type-btn ${form.productType === "variable" ? "ap-type-btn--active" : ""}`}
                                                onClick={() => setF("productType", "variable")}
                                            >
                                                Variable
                                                <span>Colors, sizes, images per variant</span>
                                            </button>
                                        </div>
                                    </div>

                                    {/* ✅ Simple product — stock only */}
                                    {form.productType === "simple" && (
                                        <div className="ap-field">
                                            <label>Stock Quantity *</label>
                                            <input
                                                type="number"
                                                value={form.stock}
                                                onChange={e => setF("stock", Number(e.target.value))}
                                                placeholder="e.g. 50"
                                                min="0"
                                            />
                                            <p style={{ fontSize: 11, color: "#888", marginTop: 4 }}>
                                                Add images after creating via the Edit panel
                                            </p>
                                        </div>
                                    )}

                                    <div className="ap-field">
                                        <label>Description</label>
                                        <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={4} placeholder="Product description…" />
                                    </div>
                                </div>
                            )}

                            {/* VARIANTS TAB — only shown for variable products */}
                            {tab === "variants" && form.productType === "variable" && (
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
                                                    {/* ✅ Color is optional */}
                                                    <label>Color Name <span style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}>(optional)</span></label>
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
                                                <label>Images *</label>
                                                <label className="ap-img-upload">
                                                    <PlusIcon /> Add Images
                                                    <input type="file" multiple accept="image/*" hidden onChange={e => addImgs(vi, e.target.files)} />
                                                </label>
                                                {/* ✅ Inline warning if no images */}
                                                {v.images.length === 0 && (
                                                    <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>
                                                        ⚠ At least one image is required
                                                    </p>
                                                )}
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
                                                {/* ✅ Sizes optional — auto-adds Standard if empty */}
                                                <label>Sizes &amp; Stock <span style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}>(optional — defaults to Standard)</span></label>
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