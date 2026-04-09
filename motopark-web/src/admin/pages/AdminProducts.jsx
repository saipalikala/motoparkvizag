import { useState, useEffect, useRef, useCallback } from "react";
import "./AdminProducts.css";
import detectColor from "@/utils/detectColor";
import { API } from "@/config/api";

const PROD_URL = `${API}/products`;
const CAT_URL = `${API}/categories`;
const PAGE_SIZE = 20;

const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}` });

const SIZE_PRESETS = [
    "XS", "S", "M", "L", "XL", "XXL", "Free Size",
    "6", "7", "8", "9", "10", "11", "One Size", "Standard",
];

/* ── Icons ──────────────────────────────────────────────────── */
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const EditIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const SearchIcon = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" /></svg>;
const CloseIcon = () => <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><path d="M2 2l8 8M10 2l-8 8" /></svg>;
const UploadIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>;
const DownloadIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="8 17 12 21 16 17" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.88 18.09A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.29" /></svg>;
const ChevronIcon = ({ dir = "right" }) => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: dir === "left" ? "rotate(180deg)" : "none" }}><path d="M9 18l6-6-6-6" /></svg>;

/* ── Helpers ─────────────────────────────────────────────────── */
const emptyForm = () => ({ name: "", price: "", brand: "", category: "", description: "", specs: "", care: "", newArrival: false, featured: false, trending: false });
const emptyVariant = () => ({ color: "#ff6b3d", colorName: "", images: [], sizes: [{ size: "", stock: 0 }] });

/** Debounce hook — avoids a lodash dependency */
function useDebounce(value, delay = 300) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}

/** Client-side image compression via Canvas (no external lib needed) */
async function compressImage(file, { maxWidth = 1200, maxSizeKB = 900 } = {}) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const scale = Math.min(1, maxWidth / img.width);
                const canvas = Object.assign(document.createElement("canvas"), {
                    width: Math.round(img.width * scale),
                    height: Math.round(img.height * scale),
                });
                canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);

                // Try quality 0.85; if still too large, drop to 0.65
                const tryQuality = (q) => new Promise((res) =>
                    canvas.toBlob((b) => res(b), "image/jpeg", q)
                );

                tryQuality(0.85).then(async (blob) => {
                    const final = blob.size / 1024 > maxSizeKB ? await tryQuality(0.65) : blob;
                    resolve(new File([final], file.name.replace(/\.[^.]+$/, ".jpg"), { type: "image/jpeg" }));
                });
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

/* ── Validation ──────────────────────────────────────────────── */
function validateForm(form, variants, allProducts, editingId) {
    if (!form.name.trim()) return "Product name is required.";
    if (!form.brand.trim()) return "Brand is required.";
    if (!form.category) return "Please select a category.";

    const price = Number(form.price);
    if (!form.price || isNaN(price) || price <= 0) return "Price must be greater than 0.";

    // Duplicate name check (case-insensitive, skip self on edit)
    const lower = form.name.trim().toLowerCase();
    const dupe = allProducts.find(p => p.name.toLowerCase() === lower && p._id !== editingId);
    if (dupe) return `A product named "${dupe.name}" already exists.`;

    if (variants.length === 0) return "Add at least one variant.";

    for (let i = 0; i < variants.length; i++) {
        const v = variants[i];
        if (v.images.length === 0)
            return `Variant ${i + 1} needs at least one image.`;

        const validSizes = v.sizes.filter(s => s.size?.trim());
        if (validSizes.length === 0)
            return `Variant ${i + 1} must have at least one size (or leave blank to auto-add "Standard").`;

        const badStock = validSizes.find(s => isNaN(s.stock) || Number(s.stock) < 0);
        if (badStock)
            return `Variant ${i + 1}: stock for "${badStock.size}" must be 0 or more.`;
    }

    return null; // ✅ valid
}

/* ════════════════════════════════════════════════
   COMPONENT
════════════════════════════════════════════════ */
const AdminProducts = () => {
    /* ── State ── */
    const [products, setProducts] = useState([]);
    const [categories, setCats] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(null); // holds _id being deleted
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [panelOpen, setPanelOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState(emptyForm());
    const [variants, setVariants] = useState([emptyVariant()]);
    const [tab, setTab] = useState("info");
    const [error, setError] = useState("");
    const [bulkStatus, setBulkStatus] = useState("");
    const [isDirty, setIsDirty] = useState(false);

    // Refs for objectURL cleanup
    const objectURLs = useRef([]);

    const debouncedSearch = useDebounce(search, 300);

    /* ── Cleanup objectURLs on unmount ── */
    useEffect(() => {
        return () => objectURLs.current.forEach(URL.revokeObjectURL);
    }, []);

    /* ── Load products (paginated) ── */
    const load = useCallback(async (p = 1, q = "") => {
        setLoading(true);
        try {
            const qs = new URLSearchParams({ page: p, limit: PAGE_SIZE, ...(q ? { search: q } : {}) }).toString();
            const [pr, cr] = await Promise.all([
                fetch(`${PROD_URL}?${qs}`, { headers: AUTH() }),
                fetch(CAT_URL),
            ]);
            const pd = await pr.json();
            const cd = await cr.json();
            setProducts(pd.products || []);
            setTotalPages(Math.max(1, Math.ceil((pd.total || (pd.products || []).length) / PAGE_SIZE)));
            setCats(cd.categories || cd || []);
        } catch (e) {
            console.error("Load error:", e);
        } finally {
            setLoading(false);
        }
    }, []);

    /* Re-fetch when page or debounced search changes */
    useEffect(() => { load(page, debouncedSearch); }, [page, debouncedSearch, load]);

    /* Reset to page 1 when search changes */
    useEffect(() => { setPage(1); }, [debouncedSearch]);

    /* ── Form helpers ── */
    const setF = (k, v) => { setForm(f => ({ ...f, [k]: v })); setIsDirty(true); };

    /* ── Variant helpers ── */
    const setVr = (i, k, v) => { setVariants(vs => vs.map((x, j) => j === i ? { ...x, [k]: v } : x)); setIsDirty(true); };
    const addVr = () => { setVariants(vs => [...vs, emptyVariant()]); setIsDirty(true); };
    const remVr = (i) => { setVariants(vs => vs.filter((_, j) => j !== i)); setIsDirty(true); };
    const addSz = (vi) => setVariants(vs => vs.map((v, i) => i === vi ? { ...v, sizes: [...v.sizes, { size: "", stock: 0 }] } : v));
    const remSz = (vi, si) => setVariants(vs => vs.map((v, i) => i === vi ? { ...v, sizes: v.sizes.filter((_, j) => j !== si) } : v));
    const setSz = (vi, si, k, val) => setVariants(vs => vs.map((v, i) => i === vi ? { ...v, sizes: v.sizes.map((s, j) => j === si ? { ...s, [k]: k === "stock" ? Number(val) : val } : s) } : v));
    const addPreset = (vi, s) => setVariants(vs => vs.map((v, i) => i === vi && !v.sizes.find(x => x.size === s) ? { ...v, sizes: [...v.sizes, { size: s, stock: 0 }] } : v));

    /* ── colorName → auto-detect color swatch ── */
    const handleColorNameChange = (vi, name) => {
        setVr(vi, "colorName", name);
        const detected = detectColor(name);
        if (detected) setVr(vi, "color", detected);
        // if null → keep existing picker value (no override)
    };

    /* ── Image upload with compression ── */
    const addImgs = async (vi, files) => {
        const compressed = await Promise.all(
            Array.from(files).map(f => compressImage(f))
        );
        const imgs = compressed.map(f => {
            const preview = URL.createObjectURL(f);
            objectURLs.current.push(preview);
            return { file: f, preview };
        });
        setVariants(vs => vs.map((v, i) => i === vi ? { ...v, images: [...v.images, ...imgs] } : v));
        setIsDirty(true);
    };

    const remImg = (vi, ii) => {
        setVariants(vs => vs.map((v, i) => {
            if (i !== vi) return v;
            const img = v.images[ii];
            if (img?.preview?.startsWith("blob:")) URL.revokeObjectURL(img.preview);
            return { ...v, images: v.images.filter((_, j) => j !== ii) };
        }));
        setIsDirty(true);
    };

    /* ── Open / close panel ── */
    const openEdit = (p) => {
        setEditingId(p._id);
        setError("");
        setIsDirty(false);
        setForm({
            name: p.name, price: p.price, brand: p.brand,
            category: p.category?._id || p.category || "",
            description: p.description || "", specs: p.specs || "", care: p.care || "",
            newArrival: !!p.newArrival, featured: !!p.featured, trending: !!p.trending,
        });
        setVariants(
            (p.variants || []).map(v => ({
                color: v.color || "#ff6b3d",
                colorName: v.colorName || v.color || "",
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
        setIsDirty(false);
        setForm(emptyForm());
        setVariants([emptyVariant()]);
        setTab("info");
        setPanelOpen(true);
    };

    const close = () => {
        if (isDirty && !window.confirm("You have unsaved changes. Close anyway?")) return;
        setPanelOpen(false);
        setEditingId(null);
        setError("");
        setIsDirty(false);
    };

    /* ── Delete ── */
    const handleDelete = async (id) => {
        if (!window.confirm("Delete this product permanently?")) return;
        setDeleting(id);
        try {
            const res = await fetch(`${PROD_URL}/${id}`, { method: "DELETE", headers: AUTH() });
            if (!res.ok) throw new Error(`Status ${res.status}`);
            load(page, debouncedSearch);
        } catch (e) {
            alert(`Delete failed: ${e.message}`);
        } finally {
            setDeleting(null);
        }
    };

    /* ── Bulk CSV ── */
    const handleBulkUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBulkStatus("Uploading…");
        const fd = new FormData();
        fd.append("csv", file);
        try {
            const res = await fetch(`${PROD_URL}/bulk`, { method: "POST", headers: AUTH(), body: fd });
            const data = await res.json();
            setBulkStatus(res.ok ? `✅ ${data.message}` : `❌ ${data.message || "Upload failed"}`);
            if (res.ok) load(1, "");
        } catch {
            setBulkStatus("❌ Upload failed — check connection");
        }
        setTimeout(() => setBulkStatus(""), 5000);
        e.target.value = "";
    };

    const downloadTemplate = () => {
        const rows = [
            "name,brand,price,category,description,color,sizes,featured,trending,newArrival",
            "Steelbird SBH-40,Steelbird,2499,Helmets,Premium full-face helmet,Matte Black,S:10|M:20|L:15,false,false,true",
            "Phone Mount Pro,Generic,599,Accessories,Universal phone holder,,Standard:50,false,false,false",
        ];
        const url = URL.createObjectURL(new Blob([rows.join("\n")], { type: "text/csv" }));
        Object.assign(document.createElement("a"), { href: url, download: "motopark_bulk_template.csv" }).click();
        URL.revokeObjectURL(url);
    };

    /* ── Submit ── */
    const handleSubmit = async (ev) => {
        ev.preventDefault();
        setError("");

        const validationError = validateForm(form, variants, products, editingId);
        if (validationError) {
            // Jump to variants tab if the error is variant-related
            if (validationError.toLowerCase().includes("variant")) setTab("variants");
            return setError(validationError);
        }

        // Auto-fix empty sizes → "Standard"
        const fixedVariants = variants.map(v => ({
            ...v,
            sizes: v.sizes.filter(s => s.size?.trim()).length > 0
                ? v.sizes.filter(s => s.size?.trim())
                : [{ size: "Standard", stock: 0 }],
        }));

        setSaving(true);
        try {
            const fd = new FormData();
            ([["name", form.name.trim()], ["brand", form.brand.trim()],
            ["price", form.price], ["category", form.category],
            ["description", form.description || ""], ["specs", form.specs || ""],
            ["care", form.care || ""], ["newArrival", String(form.newArrival)],
            ["featured", String(form.featured)], ["trending", String(form.trending)],
            ]).forEach(([k, v]) => fd.append(k, v));

            fd.append("variants", JSON.stringify(
                fixedVariants.map(v => ({
                    color: v.color,       // valid HEX or gradient from detectColor
                    colorName: v.colorName?.trim() || "",
                    sizes: v.sizes,
                }))
            ));

            fixedVariants.forEach((v, i) => {
                v.images.forEach(img => {
                    if (img.file instanceof File) fd.append(`variantImages_${i}`, img.file);
                });
            });

            const method = editingId ? "PUT" : "POST";
            const url = editingId ? `${PROD_URL}/${editingId}` : PROD_URL;

            const res = await fetch(url, { method, headers: AUTH(), body: fd });
            let data;
            try { data = await res.json(); }
            catch { const t = await res.text(); console.error("Non-JSON:", t); return setError("Server error — check backend"); }

            if (!res.ok) return setError(data?.message || data?.error || `Error ${res.status}`);

            setIsDirty(false);
            setPanelOpen(false);
            setEditingId(null);
            load(page, debouncedSearch);
        } catch (err) {
            console.error(err);
            setError("Network error — backend not reachable");
        } finally {
            setSaving(false);
        }
    };

    /* ── Derived UI values ── */
    const isFormValid = !validateForm(form, variants, products, editingId);

    const thumbSrc = (p) => {
        const img = p.variants?.[0]?.images?.[0];
        if (!img) return null;
        return typeof img === "string" && img.startsWith("http")
            ? img
            : `${API}/${String(img).replace(/^\//, "")}`;
    };

    /* ════════════════════════════════════════════
       RENDER
    ════════════════════════════════════════════ */
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
                    {search && (
                        <button className="ap-search-clear" onClick={() => setSearch("")}><CloseIcon /></button>
                    )}
                </div>

                <div className="ap-toolbar-actions">
                    <button className="ap-template-btn" onClick={downloadTemplate} title="Download CSV template">
                        <DownloadIcon /> Template
                    </button>
                    <label className="ap-bulk-btn" title="Bulk upload via CSV">
                        <UploadIcon /> Bulk Upload
                        <input type="file" accept=".csv" hidden onChange={handleBulkUpload} />
                    </label>
                    <button className="ap-add-btn" onClick={openNew}><PlusIcon /> Add Product</button>
                </div>
            </div>

            {bulkStatus && (
                <div className={`ap-bulk-status ${bulkStatus.startsWith("✅") ? "ap-bulk-status--ok" : bulkStatus.startsWith("❌") ? "ap-bulk-status--err" : ""}`}>
                    {bulkStatus}
                </div>
            )}

            <div className="ap-meta">
                <span>{loading ? "Loading…" : `${products.length} product${products.length !== 1 ? "s" : ""} on this page`}</span>
                {categories.length === 0 && <span className="ap-warn">⚠ No categories — add one first</span>}
            </div>

            {/* TABLE */}
            <div className="ap-table-wrap">
                {loading ? (
                    <div className="ap-loading">Loading…</div>
                ) : products.length === 0 ? (
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
                            {products.map(p => {
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
                                        <td><span className="ap-cat-badge">{p.category?.name || p.category}</span></td>
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
                                                <button
                                                    className="ap-del-btn"
                                                    onClick={() => handleDelete(p._id)}
                                                    disabled={deleting === p._id}
                                                >
                                                    {deleting === p._id ? "…" : <TrashIcon />}
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            {/* PAGINATION */}
            {totalPages > 1 && (
                <div className="ap-pagination">
                    <button
                        className="ap-page-btn"
                        disabled={page <= 1}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                        <ChevronIcon dir="left" /> Prev
                    </button>
                    <span className="ap-page-info">Page {page} of {totalPages}</span>
                    <button
                        className="ap-page-btn"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    >
                        Next <ChevronIcon />
                    </button>
                </div>
            )}

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

                        {error && <div className="ap-error-banner">⚠ {error}</div>}

                        <form className="ap-form" onSubmit={handleSubmit}>

                            {/* ── INFO TAB ── */}
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
                                            <input type="number" value={form.price} onChange={e => setF("price", e.target.value)} placeholder="2499" min="1" required />
                                        </div>
                                        <div className="ap-field">
                                            <label>Category *</label>
                                            <select value={form.category} onChange={e => setF("category", e.target.value)} required>
                                                <option value="">Select category</option>
                                                {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="ap-field">
                                        <label>Description</label>
                                        <textarea value={form.description} onChange={e => setF("description", e.target.value)} rows={4} placeholder="Product description…" />
                                    </div>

                                    <div className="ap-field">
                                        <label>Specs <span style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}>(one per line: Label: Value)</span></label>
                                        <textarea value={form.specs} onChange={e => setF("specs", e.target.value)} rows={5} placeholder={"Material: Premium Leather\nWeight: 450g\nCertification: CE Level 1"} />
                                    </div>

                                    <div className="ap-field">
                                        <label>Care Instructions <span style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}>(one per line)</span></label>
                                        <textarea value={form.care} onChange={e => setF("care", e.target.value)} rows={4} placeholder={"Hand wash only\nDo not tumble dry\nStore away from sunlight"} />
                                    </div>
                                </div>
                            )}

                            {/* ── VARIANTS TAB ── */}
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
                                                    <label>Color Name <span style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}>(auto-detects swatch)</span></label>
                                                    <input
                                                        value={v.colorName}
                                                        onChange={e => handleColorNameChange(vi, e.target.value)}
                                                        placeholder="e.g. Matte Black, Black & Yellow"
                                                    />
                                                </div>
                                                <div className="ap-field ap-field--color">
                                                    <label>Swatch</label>
                                                    {/* Show gradient preview if color is a gradient string */}
                                                    {v.color?.startsWith("linear-gradient") ? (
                                                        <div style={{ width: 36, height: 36, borderRadius: 8, background: v.color, border: "2px solid #ddd" }} title={v.color} />
                                                    ) : (
                                                        <input type="color" value={v.color} onChange={e => setVr(vi, "color", e.target.value)} />
                                                    )}
                                                </div>
                                            </div>

                                            <div className="ap-field">
                                                <label>Images *</label>
                                                <label className="ap-img-upload">
                                                    <PlusIcon /> Add Images
                                                    <input type="file" multiple accept="image/*" hidden onChange={e => addImgs(vi, e.target.files)} />
                                                </label>
                                                {v.images.length === 0 && (
                                                    <p style={{ fontSize: 11, color: "#dc2626", marginTop: 6 }}>⚠ At least one image required</p>
                                                )}
                                                {v.images.length > 0 && (
                                                    <div className="ap-img-grid">
                                                        {v.images.map((img, ii) => {
                                                            const src = img.preview || img.url || (typeof img === "string" ? (img.startsWith("http") ? img : `${API}/${img.replace(/^\//, "")}`) : "#");
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
                                                <label>Sizes & Stock <span style={{ color: "#aaa", fontWeight: 400, fontSize: 11 }}>(defaults to Standard if empty)</span></label>
                                                <div className="ap-size-presets">
                                                    {SIZE_PRESETS.map(s => (
                                                        <button type="button" key={s}
                                                            className={`ap-size-preset ${v.sizes.find(x => x.size === s) ? "ap-size-preset--active" : ""}`}
                                                            onClick={() => addPreset(vi, s)}>{s}</button>
                                                    ))}
                                                </div>
                                                <div className="ap-sizes">
                                                    {v.sizes.map((s, si) => (
                                                        <div className="ap-size-row" key={si}>
                                                            <input value={s.size} onChange={e => setSz(vi, si, "size", e.target.value)} placeholder="Size" className="ap-size-input" />
                                                            <input type="number" value={s.stock} min={0} onChange={e => setSz(vi, si, "stock", e.target.value)} placeholder="Stock" className="ap-stock-input" />
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

                            {/* ── FLAGS TAB ── */}
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
                                    disabled={saving || !isFormValid}
                                    title={!isFormValid ? "Fix validation errors to save" : undefined}
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