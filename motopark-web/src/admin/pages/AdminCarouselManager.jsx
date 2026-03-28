import { useEffect, useState } from "react";
import "./AdminCarouselManager.css";

import { API } from "@/config/api";
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}` });

const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const SaveIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>;
const ImageIcon = () => <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="rgba(11,29,58,0.2)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><polyline points="21 15 16 10 5 21" /></svg>;
const CheckIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>;

const AdminCarouselManager = () => {
    const [slides, setSlides] = useState([]);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [uploading, setUploading] = useState({});

    useEffect(() => {
        fetch(`${API}/carousel`)
            .then(r => r.json())
            .then(data => setSlides(Array.isArray(data) ? data : []))
            .catch(console.error);
    }, []);

    const set = (i, k, v) => {
        if (k === "route") v = v.replace("/category/", "").replace("/", "").trim().toLowerCase();
        setSlides(ss => ss.map((s, j) => j === i ? { ...s, [k]: v } : s));
    };

    const addSlide = () => setSlides(ss => [...ss, { title: "", subtitle: "", route: "", image: "", cta: "" }]);

    const deleteSlide = async (slide, i) => {
        if (!confirm("Delete this slide?")) return;
        if (slide._id) {
            await fetch(`${API}/carousel/${slide._id}`, { method: "DELETE", headers: AUTH() });
        }
        setSlides(ss => ss.filter((_, j) => j !== i));
    };

    const uploadImage = async (file, i) => {
        setUploading(u => ({ ...u, [i]: true }));
        const fd = new FormData();
        fd.append("carousel", file);
        try {
            const res = await fetch(`${API}/upload/carousel`, { method: "POST", body: fd });
            const data = await res.json();
            set(i, "image", data.url);
        } catch (e) { console.error(e); }
        finally { setUploading(u => ({ ...u, [i]: false })); }
    };

    const save = async () => {
        setSaving(true);
        try {
            for (const slide of slides) {
                const body = JSON.stringify(slide);
                const headers = { ...AUTH(), "Content-Type": "application/json" };
                if (slide._id) {
                    await fetch(`${API}/carousel/${slide._id}`, { method: "PUT", headers, body });
                } else {
                    await fetch(`${API}/carousel`, { method: "POST", headers, body });
                }
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    return (
        <div className="acm-page">

            {/* HEADER */}
            <div className="acm-header">
                <div>
                    <p className="acm-eyebrow">{slides.length} slide{slides.length !== 1 ? "s" : ""}</p>
                    <p className="acm-hint">These slides appear in the hero carousel on your homepage.</p>
                </div>
                <button className="acm-add-btn" onClick={addSlide}><PlusIcon /> Add Slide</button>
            </div>

            {/* SLIDES */}
            <div className="acm-slides">
                {slides.length === 0 && (
                    <div className="acm-empty">No slides yet — click "Add Slide" to create your first hero banner.</div>
                )}

                {slides.map((slide, i) => (
                    <div className="acm-slide" key={i}>

                        {/* SLIDE NUMBER */}
                        <div className="acm-slide-num">{i + 1}</div>

                        {/* IMAGE UPLOAD */}
                        <div className="acm-img-section">
                            <label className={`acm-drop ${uploading[i] ? "acm-drop--uploading" : ""} ${slide.image ? "acm-drop--has-img" : ""}`}>
                                {uploading[i] ? (
                                    <span className="acm-spinner" />
                                ) : slide.image ? (
                                    <img
                                        src={slide.image.startsWith("http") ? slide.image : `${API}${slide.image}`}
                                        alt="slide preview"
                                        className="acm-preview-img"
                                    />
                                ) : (
                                    <>
                                        <ImageIcon />
                                        <span>Drop image or <strong>click to upload</strong></span>
                                        <span className="acm-drop-hint">Recommended: 1920×1080px</span>
                                    </>
                                )}
                                <input type="file" accept="image/*" hidden onChange={e => uploadImage(e.target.files[0], i)} />
                            </label>
                            {slide.image && (
                                <button className="acm-change-img" onClick={() => set(i, "image", "")}>Change Image</button>
                            )}
                        </div>

                        {/* FIELDS */}
                        <div className="acm-fields">
                            <div className="acm-field-row">
                                <div className="acm-field">
                                    <label>Title</label>
                                    <input value={slide.title} onChange={e => set(i, "title", e.target.value)} placeholder="e.g. Premium Riding Helmets" />
                                </div>
                                <div className="acm-field">
                                    <label>Subtitle</label>
                                    <input value={slide.subtitle} onChange={e => set(i, "subtitle", e.target.value)} placeholder="e.g. Ride safer with MotoPark gear" />
                                </div>
                            </div>
                            <div className="acm-field-row">
                                <div className="acm-field">
                                    <label>Category Slug</label>
                                    <div className="acm-slug-wrap">
                                        <span className="acm-slug-pre">/category/</span>
                                        <input
                                            value={slide.route}
                                            onChange={e => set(i, "route", e.target.value)}
                                            placeholder="helmets"
                                            className="acm-slug-input"
                                        />
                                    </div>
                                    <span className="acm-field-hint">Button will link to /category/{slide.route || "…"}</span>
                                </div>
                                <div className="acm-field">
                                    <label>Button Text (optional)</label>
                                    <input value={slide.cta || ""} onChange={e => set(i, "cta", e.target.value)} placeholder="e.g. Shop Helmets" />
                                </div>
                            </div>
                        </div>

                        {/* DELETE */}
                        <button className="acm-del-btn" onClick={() => deleteSlide(slide, i)} aria-label="Delete slide">
                            <TrashIcon />
                        </button>
                    </div>
                ))}
            </div>

            {/* SAVE BAR */}
            <div className="acm-save-bar">
                <p className="acm-save-hint">Carousel changes are live immediately after saving.</p>
                <button
                    className={`acm-save-btn ${saved ? "acm-save-btn--saved" : ""}`}
                    onClick={save}
                    disabled={saving}
                >
                    {saved ? <><CheckIcon /> Saved!</>
                        : saving ? <><span className="acm-btn-spinner" /> Saving…</>
                            : <><SaveIcon /> Save Carousel</>}
                </button>
            </div>
        </div>
    );
};

export default AdminCarouselManager;