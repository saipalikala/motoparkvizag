import { useState, useEffect } from "react";
import "./AdminNavbarManager.css";

import { API } from "@/config/api";
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}` });

/* ─── ICONS ─── */
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const SaveIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
const DragIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="5" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="9" cy="19" r="1" fill="currentColor" /><circle cx="15" cy="5" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="19" r="1" fill="currentColor" /></svg>;
const ImageIcon = () => <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(11,29,58,0.2)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const LinkIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></svg>;
const CheckIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;

const SYSTEM_PATHS = ["/", "/store", "/about", "/contact"];

const AdminNavbarManager = () => {
    const [navbar, setNavbar] = useState(null);
    const [categories, setCats] = useState([]);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [saved, setSaved] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [dragIdx, setDragIdx] = useState(null);
    const [overIdx, setOverIdx] = useState(null);

    /* ── LOAD ── */
    useEffect(() => {
        // load navbar
        fetch(`${API}/api/navbar`)
            .then(r => r.json())
            .then(data => {
                const links = (data.links || []).map(l => ({
                    ...l,
                    slug: l.slug || l.path?.replace("/", "") || "",
                }));
                setNavbar({ ...data, links });
            })
            .catch(console.error);

        // load categories (to suggest slugs)
        fetch(`${API}/api/categories`)
            .then(r => r.json())
            .then(d => setCats(d.categories || d || []))
            .catch(console.error);
    }, []);

    if (!navbar) return <div className="anm-loading">Loading navbar…</div>;

    /* ── HELPERS ── */
    const setLink = (i, k, v) => {
        const links = [...navbar.links];
        links[i] = { ...links[i], [k]: v };
        // auto-generate path from slug
        if (k === "slug") links[i].path = v ? `/${v}` : "";
        setNavbar({ ...navbar, links });
    };

    const addLink = (preset = null) => {
        const newLink = preset
            ? { name: preset.name, slug: preset.name.toLowerCase().replace(/\s+/g, "-"), path: `/${preset.name.toLowerCase().replace(/\s+/g, "-")}` }
            : { name: "", slug: "", path: "" };
        setNavbar({ ...navbar, links: [...navbar.links, newLink] });
    };

    const removeLink = (i) => {
        setNavbar({ ...navbar, links: navbar.links.filter((_, j) => j !== i) });
    };

    /* ── DRAG REORDER ── */
    const onDragStart = (i) => setDragIdx(i);
    const onDragOver = (e, i) => { e.preventDefault(); setOverIdx(i); };
    const onDrop = (e, i) => {
        e.preventDefault();
        if (dragIdx === null || dragIdx === i) { setDragIdx(null); setOverIdx(null); return; }
        const links = [...navbar.links];
        const [moved] = links.splice(dragIdx, 1);
        links.splice(i, 0, moved);
        setNavbar({ ...navbar, links });
        setDragIdx(null); setOverIdx(null);
    };

    /* ── SAVE ── */
    const save = async () => {
        setSaving(true);
        try {
            await fetch(`${API}/api/navbar`, {
                method: "PUT",
                headers: { ...AUTH(), "Content-Type": "application/json" },
                body: JSON.stringify(navbar),
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    /* ── LOGO UPLOAD ── */
    const uploadLogo = async (file) => {
        if (!file) return;
        setUploading(true);
        const fd = new FormData();
        fd.append("logo", file);
        try {
            const res = await fetch(`${API}/api/upload/logo`, { method: "POST", body: fd });
            const data = await res.json();
            setNavbar({ ...navbar, logo: data.url });
        } catch (e) { console.error(e); }
        finally { setUploading(false); }
    };

    /* categorties not yet in navbar links */
    const unusedCats = categories.filter(c => {
        const slug = c.name.toLowerCase().replace(/\s+/g, "-");
        return !navbar.links.find(l => l.slug === slug || l.name?.toLowerCase() === c.name?.toLowerCase());
    });

    return (
        <div className="anm-page">

            {/* ── LOGO SECTION ── */}
            <div className="anm-card">
                <h2 className="anm-card-title">Store Logo</h2>
                <p className="anm-card-sub">This logo appears in your navbar. Drag & drop or click to upload.</p>

                <div className="anm-logo-row">
                    {/* DROP ZONE */}
                    <label
                        className={`anm-drop-zone ${dragOver ? "anm-drop-zone--over" : ""}`}
                        onDrop={(e) => { e.preventDefault(); setDragOver(false); uploadLogo(e.dataTransfer.files[0]); }}
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                        onDragLeave={() => setDragOver(false)}
                    >
                        {uploading ? (
                            <span className="anm-spinner" />
                        ) : (
                            <>
                                <ImageIcon />
                                <span>Drop logo here or <strong>click to browse</strong></span>
                                <span className="anm-drop-hint">PNG, SVG recommended · Max 2MB</span>
                            </>
                        )}
                        <input type="file" accept="image/*" hidden onChange={e => uploadLogo(e.target.files[0])} />
                    </label>

                    {/* PREVIEW */}
                    {navbar.logo && (
                        <div className="anm-logo-preview">
                            <p className="anm-preview-label">Current</p>
                            <div className="anm-logo-bg">
                                <img
                                    src={navbar.logo.startsWith("http") ? navbar.logo : `${API}${navbar.logo}`}
                                    alt="Logo preview"
                                    className="anm-logo-img"
                                />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── QUICK ADD FROM CATEGORIES ── */}
            {unusedCats.length > 0 && (
                <div className="anm-card">
                    <h2 className="anm-card-title">Add Category Links</h2>
                    <p className="anm-card-sub">These categories exist in your store but aren't in your navbar yet.</p>
                    <div className="anm-quick-cats">
                        {unusedCats.map(c => (
                            <button key={c._id} className="anm-cat-pill" onClick={() => addLink(c)}>
                                <PlusIcon /> {c.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* ── LINKS ── */}
            <div className="anm-card">
                <div className="anm-links-header">
                    <div>
                        <h2 className="anm-card-title">Navigation Links</h2>
                        <p className="anm-card-sub">Drag to reorder. Changes take effect after saving.</p>
                    </div>
                    <button className="anm-add-btn" onClick={() => addLink()}>
                        <PlusIcon /> Add Link
                    </button>
                </div>

                {/* COLUMN HEADERS */}
                <div className="anm-col-headers">
                    <span style={{ width: 24 }} />
                    <span>Display Name</span>
                    <span>Slug / Path</span>
                    <span>Preview URL</span>
                    <span style={{ width: 32 }} />
                </div>

                <div className="anm-links-list">
                    {navbar.links.map((link, i) => {
                        const isSystem = SYSTEM_PATHS.includes(link.path);
                        return (
                            <div
                                key={i}
                                className={`anm-link-row ${overIdx === i ? "anm-link-row--over" : ""}`}
                                draggable
                                onDragStart={() => onDragStart(i)}
                                onDragOver={e => onDragOver(e, i)}
                                onDrop={e => onDrop(e, i)}
                                onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                            >
                                {/* DRAG HANDLE */}
                                <div className="anm-drag-handle"><DragIcon /></div>

                                {/* NAME */}
                                <input
                                    className="anm-link-input"
                                    value={link.name}
                                    onChange={e => setLink(i, "name", e.target.value)}
                                    placeholder="Display name"
                                />

                                {/* SLUG — with category suggestions */}
                                <div className="anm-slug-wrap">
                                    <span className="anm-slug-prefix">/</span>
                                    <input
                                        className="anm-link-input anm-slug-input"
                                        value={link.slug || ""}
                                        onChange={e => setLink(i, "slug", e.target.value.toLowerCase().replace(/\s+/g, "-"))}
                                        placeholder={isSystem ? "system route" : "e.g. helmets"}
                                        disabled={isSystem}
                                        list={`cats-${i}`}
                                    />
                                    <datalist id={`cats-${i}`}>
                                        {categories.map(c => (
                                            <option key={c._id} value={c.name.toLowerCase().replace(/\s+/g, "-")}>{c.name}</option>
                                        ))}
                                    </datalist>
                                </div>

                                {/* PREVIEW */}
                                <div className="anm-link-preview">
                                    <LinkIcon />
                                    <span>
                                        {isSystem
                                            ? link.path
                                            : link.slug ? `/category/${link.slug}` : "—"
                                        }
                                    </span>
                                </div>

                                {/* DELETE */}
                                <button
                                    className="anm-del-btn"
                                    onClick={() => removeLink(i)}
                                    aria-label="Remove link"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        );
                    })}

                    {navbar.links.length === 0 && (
                        <div className="anm-links-empty">No links yet — add one above</div>
                    )}
                </div>
            </div>

            {/* ── SAVE BAR ── */}
            <div className="anm-save-bar">
                <p className="anm-save-hint">
                    {navbar.links.length} link{navbar.links.length !== 1 ? "s" : ""} · Changes are live after saving
                </p>
                <button
                    className={`anm-save-btn ${saved ? "anm-save-btn--saved" : ""}`}
                    onClick={save}
                    disabled={saving}
                >
                    {saved
                        ? <><CheckIcon /> Saved!</>
                        : saving
                            ? <><span className="anm-btn-spinner" /> Saving…</>
                            : <><SaveIcon /> Save Navbar</>
                    }
                </button>
            </div>

        </div>
    );
};

export default AdminNavbarManager;