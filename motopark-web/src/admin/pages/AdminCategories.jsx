import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "./AdminCategories.css";

// const API = "http://localhost:5000/api/categories";
import { API } from "@/config/api"; // ✅ ADDED

// ✅ Correct endpoint
const CATEGORY_API = `${API}/api/categories`;

const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });

const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;

const DEFAULT_CATS = ["Helmets", "Jackets", "Gloves", "Luggage", "Riding Pants", "Riding Boots", "Accessories"];

const AdminCategories = () => {
    const [categories, setCategories] = useState([]);
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [msg, setMsg] = useState("");
    const [lastAdded, setLastAdded] = useState(null);
    const navigate = useNavigate();

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(CATEGORY_API);
            const data = await res.json();
            setCategories(data.categories || data || []);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { load(); }, []);

    const flash = (text) => { setMsg(text); setTimeout(() => setMsg(""), 3000); };

    const handleAdd = async (catName) => {
        const n = (catName || name).trim();
        if (!n) return;
        setSaving(true);
        try {
            const res = await fetch(CATEGORY_API, {
                method: "POST",
                headers: AUTH(),
                body: JSON.stringify({ name: n }),
            });
            if (res.ok) {
                setName(""); load(); flash(`"${n}" added`);
                setLastAdded(n);
            }
            else { const d = await res.json(); flash(d.message || "Error"); }
        } catch (e) { flash("Server error"); }
        finally { setSaving(false); }
    };

    const handleDelete = async (id, name) => {
        if (!confirm(`Delete "${name}"? Products in this category will lose their category.`)) return;
        try {
            await fetch(`${CATEGORY_API}/${id}`, { method: "DELETE", headers: AUTH() });
            load();
            flash(`"${name}" deleted`);
        } catch (e) { flash("Error deleting"); }
    };

    const quickAdd = (cat) => {
        if (categories.find(c => c.name?.toLowerCase() === cat.toLowerCase())) {
            flash(`"${cat}" already exists`);
            return;
        }
        handleAdd(cat);
    };

    return (
        <div className="acat-page">

            {/* FLASH */}
            {msg && <div className="acat-flash">{msg}</div>}

            {/* NAVBAR PROMPT */}
            {lastAdded && (
                <div className="acat-prompt">
                    <div>
                        <strong>"{lastAdded}" created!</strong>
                        <span>Add it to your navbar so customers can browse this category.</span>
                    </div>
                    <button className="acat-prompt-btn" onClick={() => navigate("/admin/navbar")}>
                        Go to Navbar Manager →
                    </button>
                </div>
            )}

            {/* QUICK ADD */}
            <div className="acat-card">
                <h2 className="acat-card-title">Quick Add Common Categories</h2>
                <p className="acat-card-sub">These are the standard MotoPark categories that match your navbar links.</p>
                <div className="acat-quick-grid">
                    {DEFAULT_CATS.map(cat => {
                        const exists = categories.find(c => c.name?.toLowerCase() === cat.toLowerCase());
                        return (
                            <button
                                key={cat}
                                className={`acat-quick-btn ${exists ? "acat-quick-btn--exists" : ""}`}
                                onClick={() => !exists && quickAdd(cat)}
                                disabled={!!exists}
                            >
                                {exists ? "✓ " : "+ "}{cat}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* MANUAL ADD */}
            <div className="acat-card">
                <h2 className="acat-card-title">Add Custom Category</h2>
                <div className="acat-add-row">
                    <input
                        className="acat-input"
                        placeholder="Category name e.g. Riding Gear"
                        value={name}
                        onChange={e => setName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleAdd()}
                    />
                    <button
                        className="acat-add-btn"
                        onClick={() => handleAdd()}
                        disabled={!name.trim() || saving}
                    >
                        <PlusIcon /> {saving ? "Adding…" : "Add"}
                    </button>
                </div>
            </div>

            {/* CATEGORY LIST */}
            <div className="acat-card">
                <h2 className="acat-card-title">
                    All Categories
                    <span className="acat-count">{categories.length}</span>
                </h2>

                {loading ? (
                    <div className="acat-loading">Loading…</div>
                ) : categories.length === 0 ? (
                    <div className="acat-empty">No categories yet — add some above!</div>
                ) : (
                    <div className="acat-list">
                        {categories.map(c => (
                            <div className="acat-row" key={c._id}>
                                <div className="acat-row-left">
                                    <div className="acat-dot" />
                                    <div>
                                        <span className="acat-name">{c.name}</span>
                                        <span className="acat-id">id: {c._id}</span>
                                    </div>
                                </div>
                                <button
                                    className="acat-del-btn"
                                    onClick={() => handleDelete(c._id, c.name)}
                                    aria-label="Delete"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* HINT */}
            <div className="acat-hint">
                <strong>How it works:</strong> Category names must match your navbar link paths.
                If your navbar link goes to <code>/category/helmets</code>, your category name should be <code>Helmets</code> (case-insensitive match).
                When adding products, select the correct category so they appear on the right page.
            </div>

        </div>
    );
};

export default AdminCategories;