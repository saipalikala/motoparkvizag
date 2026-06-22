/**
 * AdminCarouselManager.jsx  — Production build
 *
 * Premium Carousel: IMAGE ONLY.
 * Each slide has two required images:
 *   desktopImage — shown on screens > 768 px
 *   mobileImage  — shown on screens ≤ 768 px
 *
 * Video support has been completely removed from Premium Carousel.
 * Vertical Carousel is unaffected (fetches source=vertical, image-only).
 */
import { useEffect, useState, useRef, useCallback, memo } from "react";
import "./AdminCarouselManager.css";
import { API } from "@/config/api";
import { invalidateCache } from "@/lib/apiCache";

/* ─── Auth ─── */
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH  = () => ({ Authorization: `Bearer ${TOKEN()}` });

/* ─── Upload endpoint ─── */
const IMG_ENDPOINT = "/upload/carousel";
const IMG_FIELD    = "carousel";

/* ─── Limits ─── */
const MAX_IMAGE_MB = 1;

/* ─── Carousel source selector ─── */
const SOURCES = [
    { value: "premium",  label: "Premium Carousel (Hero)" },
    { value: "vertical", label: "Vertical Carousel" },
];

/* ─── Max slides ─── */
const MAX_SLOTS = 5;

/* ─── Resolve Cloudinary / relative URLs ─── */
const resolveUrl = (src) => {
    if (!src) return "";
    if (/^https?:\/\/|^\/assets|^data:/.test(src)) return src;
    return `${API}${src.startsWith("/") ? "" : "/"}${src}`;
};

/* ─── Client-side image validation ─── */
const validateImage = (file) => {
    if (!file) return "No file selected.";
    if (!file.type.startsWith("image/"))
        return `Expected an image, got "${file.type}".`;
    if (file.size > MAX_IMAGE_MB * 1024 * 1024)
        return `Image is ${(file.size / 1024 / 1024).toFixed(1)} MB — max ${MAX_IMAGE_MB} MB.`;
    return null;
};

/* ─── XHR upload with real progress ─── */
const xhrUpload = ({ file, endpoint, field, token, onProgress }) =>
    new Promise((resolve, reject) => {
        const fd  = new FormData();
        fd.append(field, file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API}${endpoint}`);
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) onProgress(Math.round(e.loaded / e.total * 100));
        };
        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const d = JSON.parse(xhr.responseText);
                    const u = d.url || d.path || d?.data?.url;
                    if (u) resolve(u);
                    else reject(new Error("Server response missing 'url'."));
                } catch { reject(new Error("Could not parse server response.")); }
            } else {
                let msg = `Upload failed (HTTP ${xhr.status})`;
                try { msg = JSON.parse(xhr.responseText)?.message || msg; } catch { /**/ }
                reject(new Error(msg));
            }
        };
        xhr.onerror   = () => reject(new Error("Network error."));
        xhr.ontimeout = () => reject(new Error("Upload timed out."));
        xhr.timeout   = 5 * 60 * 1000;
        xhr.send(fd);
    });

/* ══════════════════════════════════════
   ICONS
══════════════════════════════════════ */
const Icon = ({ d, size = 14, ...p }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
         stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...p}>
        <path d={d}/>
    </svg>
);
const PlusIcon  = () => <Icon d="M12 5v14M5 12h14"/>;
const TrashIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>
    </svg>
);
const SaveIcon  = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
        <polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
);
const CheckIcon = () => <Icon d="M20 6L9 17l-5-5" size={13}/>;
const ImgIcon   = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
    </svg>
);
const MonitorIcon = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="2" y="3" width="20" height="14" rx="2"/>
        <line x1="8" y1="21" x2="16" y2="21"/>
        <line x1="12" y1="17" x2="12" y2="21"/>
    </svg>
);
const PhoneIcon = () => (
    <svg width="10" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="5" y="2" width="14" height="20" rx="2"/>
        <line x1="12" y1="18" x2="12.01" y2="18"/>
    </svg>
);

/* ══════════════════════════════════════
   PROGRESS BAR
══════════════════════════════════════ */
const ProgressBar = memo(({ progress, label }) => (
    <div className="acm-progress-wrap">
        <div className="acm-progress-track">
            <div className="acm-progress-fill" style={{ width: `${progress}%` }}/>
        </div>
        <p className="acm-progress-label">{label}</p>
    </div>
));
ProgressBar.displayName = "ProgressBar";

/* ══════════════════════════════════════
   IMAGE DROP ZONE
══════════════════════════════════════ */
const ImageDropZone = memo(({ label, badge, value, uploadState, onFile, onClear }) => {
    const inputRef          = useRef(null);
    const [drag, setDrag]   = useState(false);
    const [error, setError] = useState(null);

    const handleFile = useCallback((file) => {
        setError(null);
        const err = validateImage(file);
        if (err) { setError(err); return; }
        onFile(file);
    }, [onFile]);

    const hasVal = Boolean(value);
    const cls = [
        "acm-drop",
        drag        ? "acm-drop--drag"      : "",
        uploadState ? "acm-drop--uploading" : "",
        hasVal && !uploadState ? "acm-drop--has-img" : "",
    ].filter(Boolean).join(" ");

    return (
        <div className="acm-dropzone-wrap">
            <p className="acm-media-label">
                {label}
                {badge && <span className="acm-media-badge">{badge}</span>}
            </p>
            <div
                className={cls}
                onDragOver={e  => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => {
                    e.preventDefault(); setDrag(false);
                    const f = e.dataTransfer.files?.[0];
                    if (f) handleFile(f);
                }}
                onClick={() => !uploadState && inputRef.current?.click()}
                role="button" tabIndex={uploadState ? -1 : 0}
                onKeyDown={e => e.key === "Enter" && !uploadState && inputRef.current?.click()}
            >
                {uploadState && <ProgressBar progress={uploadState.progress} label={uploadState.label}/>}

                {!uploadState && hasVal && (
                    <img src={resolveUrl(value)} alt="preview" className="acm-preview-img"/>
                )}

                {!uploadState && !hasVal && (
                    <>
                        <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                             stroke="rgba(11,29,58,.2)" strokeWidth="1.5" strokeLinecap="round">
                            <rect x="3" y="3" width="18" height="18" rx="2"/>
                            <circle cx="8.5" cy="8.5" r="1.5"/>
                            <polyline points="21 15 16 10 5 21"/>
                        </svg>
                        <span>Drop image or <strong>click to browse</strong></span>
                        <span className="acm-drop-hint">JPG, PNG, WebP · max {MAX_IMAGE_MB} MB</span>
                    </>
                )}

                <input ref={inputRef} type="file"
                       accept="image/jpeg,image/png,image/webp,image/gif,image/*"
                       hidden
                       onClick={e => { e.target.value = ""; }}
                       onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}/>
            </div>

            {error && <p className="acm-drop-error" role="alert">⚠ {error}</p>}

            {hasVal && !uploadState && (
                <button className="acm-change-img" type="button"
                        onClick={e => { e.stopPropagation(); onClear(); }}>
                    ✕ Remove image
                </button>
            )}
        </div>
    );
});
ImageDropZone.displayName = "ImageDropZone";

/* ══════════════════════════════════════
   SLIDE CARD
══════════════════════════════════════ */
const SlideCard = memo(({ slide, index, uploadMap, onSet, onUpload, onDelete }) => {
    const desktopState = uploadMap[`${index}_desktopImage`] ?? null;
    const mobileState  = uploadMap[`${index}_mobileImage`]  ?? null;

    return (
        <div className="acm-slide">
            <div className="acm-slide-num">{index + 1}</div>

            <div className="acm-img-section">
                {/* Type badge — image only, read-only */}
                <div className="acm-type-toggle" role="group">
                    <span className="acm-type-btn acm-type-btn--active">
                        <ImgIcon/> Image
                    </span>
                </div>

{/* Desktop image */}
                <ImageDropZone
                    label={<><MonitorIcon/> Desktop Image</>}
                    badge="required · > 768 px"
                    value={slide.desktopImage || slide.image || ""}
                    uploadState={desktopState}
                    onFile={f => onUpload(f, index, "desktopImage")}
                    onClear={() => onSet(index, "desktopImage", "")}
                />

                {/* Mobile image */}
                <ImageDropZone
                    label={<><PhoneIcon/> Mobile Image</>}
                    badge="required · ≤ 768 px"
                    value={slide.mobileImage || slide.desktopImage || slide.image || ""}
                    uploadState={mobileState}
                    onFile={f => onUpload(f, index, "mobileImage")}
                    onClear={() => onSet(index, "mobileImage", "")}
                />
            </div>

            <div className="acm-fields">
                <div className="acm-field-row">
                    <div className="acm-field">
                        <label htmlFor={`title-${index}`}>Title</label>
                        <input id={`title-${index}`} value={slide.title}
                               onChange={e => onSet(index, "title", e.target.value)}
                               placeholder="e.g. Premium Riding Helmets"/>
                    </div>
                    <div className="acm-field">
                        <label htmlFor={`sub-${index}`}>Subtitle</label>
                        <input id={`sub-${index}`} value={slide.subtitle}
                               onChange={e => onSet(index, "subtitle", e.target.value)}
                               placeholder="e.g. Ride safer with MotoPark gear"/>
                    </div>
                </div>
                <div className="acm-field-row">
                    <div className="acm-field">
                        <label htmlFor={`route-${index}`}>Category Slug</label>
                        <div className="acm-slug-wrap">
                            <span className="acm-slug-pre">/category/</span>
                            <input id={`route-${index}`} value={slide.route}
                                   onChange={e => onSet(index, "route",
                                       e.target.value.replace(/\/category\//g, "").replace(/\//g, "").trim().toLowerCase()
                                   )}
                                   placeholder="helmets" className="acm-slug-input"/>
                        </div>
                        <span className="acm-field-hint">→ /category/{slide.route || "…"}</span>
                    </div>
                    <div className="acm-field">
                        <label htmlFor={`cta-${index}`}>Button Text</label>
                        <input id={`cta-${index}`} value={slide.cta || ""}
                               onChange={e => onSet(index, "cta", e.target.value)}
                               placeholder="e.g. Shop Helmets"/>
                    </div>
                </div>
            </div>

            <button className="acm-del-btn" onClick={() => onDelete(slide, index)}
                    aria-label={`Delete slide ${index + 1}`}>
                <TrashIcon/>
            </button>
        </div>
    );
});
SlideCard.displayName = "SlideCard";

/* ══════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════ */
const AdminCarouselManager = () => {
    const [source,    setSource]    = useState("premium");
    const [slides,    setSlides]    = useState([]);
    const [saving,    setSaving]    = useState(false);
    const [saved,     setSaved]     = useState(false);
    /* uploadMap: key = "slideIndex_fieldName" → { progress, label } | null */
    const [uploadMap, setUploadMap] = useState({});

    /* Fetch slides for the selected source */
/* Fetch slides — normalise desktopImage/mobileImage from legacy image field */
    useEffect(() => {
        setSlides([]);
        fetch(`${API}/carousel?source=${source}`, { cache: "no-store" })
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data)) return;
                setSlides(data.map(s => ({
                    ...s,
                    desktopImage: s.desktopImage || s.image || "",
                    mobileImage:  s.mobileImage  || s.desktopImage || s.image || "",
                    source,
                })));
            })
            .catch(console.error);
    }, [source]);

    const set = useCallback((i, k, v) => {
        setSlides(ss => ss.map((s, j) => j === i ? { ...s, [k]: v } : s));
    }, []);

    const addSlide = useCallback(() => {
        setSlides(ss => {
            if (ss.length >= MAX_SLOTS) return ss;
            return [...ss, {
                title: "", subtitle: "", route: "", cta: "",
                desktopImage: "", mobileImage: "",
                source,
            }];
        });
    }, [source]);

    const deleteSlide = useCallback(async (slide, i) => {
        if (!confirm(`Delete slide ${i + 1}?`)) return;
        if (slide._id) {
            await fetch(`${API}/carousel/${slide._id}`, {
                method: "DELETE", headers: AUTH(),
            }).catch(console.error);
        }
        setSlides(ss => ss.filter((_, j) => j !== i));
    }, []);

    const upload = useCallback(async (file, slideIndex, fieldName) => {
        const key = `${slideIndex}_${fieldName}`;

        const setProgress = (progress) => {
            setUploadMap(m => ({
                ...m,
                [key]: {
                    progress,
                    label: progress < 100 ? `Uploading… ${progress}%` : "Processing…",
                },
            }));
        };

        setProgress(0);
        try {
            const uploadedUrl = await xhrUpload({
                file,
                endpoint: IMG_ENDPOINT,
                field:    IMG_FIELD,
                token:    TOKEN(),
                onProgress: setProgress,
            });
            set(slideIndex, fieldName, uploadedUrl);
        } catch (err) {
            console.error(`[ACM] ${fieldName} upload error:`, err.message);
            alert(`Upload failed: ${err.message}`);
        } finally {
            setUploadMap(m => { const n = { ...m }; delete n[key]; return n; });
        }
    }, [set]);

const save = async () => {
        /* Validate new slides only — existing slides keep their stored images */
        for (let i = 0; i < slides.length; i++) {
            const s = slides[i];
            if (!s._id) {
                if (!s.desktopImage?.trim()) { alert(`Slide ${i + 1}: Desktop image is required.`); return; }
                if (!s.mobileImage?.trim())  { alert(`Slide ${i + 1}: Mobile image is required.`);  return; }
            }
        }

        setSaving(true);
        try {
            for (const slide of slides) {
                const headers = { ...AUTH(), "Content-Type": "application/json" };

                if (slide._id) {
                    /* Selective payload — never send empty strings that would wipe stored images */
                    const payload = {
                        title:    slide.title    ?? "",
                        subtitle: slide.subtitle ?? "",
                        route:    slide.route    ?? "",
                        cta:      slide.cta      ?? "",
                        order:    slide.order,
                        active:   slide.active,
                        source,
                    };
                    if (slide.desktopImage?.trim()) payload.desktopImage = slide.desktopImage.trim();
                    if (slide.mobileImage?.trim())  payload.mobileImage  = slide.mobileImage.trim();

                    await fetch(`${API}/carousel/${slide._id}`, {
                        method: "PUT", headers,
                        body: JSON.stringify(payload),
                    });
                } else {
                    await fetch(`${API}/carousel`, {
                        method: "POST", headers,
                        body: JSON.stringify({ ...slide, source }),
                    });
                }
            }

/* Bust in-memory + sessionStorage cache so frontend gets fresh data */
            try {
                invalidateCache(`${API}/carousel`);
                invalidateCache(`${API}/carousel?source=premium`);
                invalidateCache(`${API}/carousel?source=vertical`);
                if ("caches" in window) {
                    const names = await caches.keys();
                    await Promise.all(names.map(n =>
                        caches.open(n).then(c => {
                            c.delete(`${API}/carousel`);
                            c.delete(`${API}/carousel?source=premium`);
                            c.delete(`${API}/carousel?source=vertical`);
                        })
                    ));
                }
            } catch (_) { /* non-fatal */ }

            const fresh = await fetch(`${API}/carousel?source=${source}`, { cache: "no-store" }).then(r => r.json());
            if (Array.isArray(fresh)) {
                setSlides(fresh.map(s => ({
                    ...s,
                    desktopImage: s.desktopImage || s.image || "",
                    mobileImage:  s.mobileImage  || s.desktopImage || s.image || "",
                    source,
                })));
            }
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
        } catch (e) {
            console.error("[ACM] Save error:", e);
            alert("Save failed — check the console.");
        } finally {
            setSaving(false);
        }
    };

    const anyUploading = Object.keys(uploadMap).length > 0;
    const atMax        = slides.length >= MAX_SLOTS;

    return (
        <div className="acm-page">
            <div className="acm-header">
                <div>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                        {SOURCES.map(s => (
                            <button
                                key={s.value}
                                onClick={() => setSource(s.value)}
                                style={{
                                    padding: "6px 14px",
                                    borderRadius: "8px",
                                    border: "1.5px solid",
                                    borderColor: source === s.value ? "#ff6b3d" : "#d1d5db",
                                    background:  source === s.value ? "rgba(255,107,61,0.12)" : "#f3f4f6",
                                    color:       source === s.value ? "#ff6b3d" : "#6b7280",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                }}
                            >
                                {s.label}
                            </button>
                        ))}
                    </div>
                    <p className="acm-eyebrow">{slides.length}/{MAX_SLOTS} slides</p>
                    <p className="acm-hint">
                        {source === "premium"
                            ? "Each slide needs a Desktop image (> 768 px) and a Mobile image (≤ 768 px)."
                            : "Image-only vertical carousel slides."}
                    </p>
                </div>
                <button className="acm-add-btn" onClick={addSlide} disabled={atMax}
                        title={atMax ? "Maximum 5 slides" : "Add next slide"}>
                    <PlusIcon/>{atMax ? "5 slides max" : "Add Slide"}
                </button>
            </div>

            <div className="acm-slides">
                {slides.length === 0 && (
                    <div className="acm-empty">
                        No slides yet — click <strong>Add Slide</strong> to start.
                    </div>
                )}
                {slides.map((slide, i) => (
                    <SlideCard key={slide._id ?? i} slide={slide} index={i}
                               uploadMap={uploadMap} onSet={set}
                               onUpload={upload} onDelete={deleteSlide}/>
                ))}
            </div>

            <div className="acm-save-bar">
                <p className="acm-save-hint">
                    {anyUploading
                        ? "⏳ Upload in progress — wait before saving."
                        : "Changes go live immediately after saving."}
                </p>
                <button className={`acm-save-btn ${saved ? "acm-save-btn--saved" : ""}`}
                        onClick={save} disabled={saving || anyUploading}>
                    {saved   ? <><CheckIcon/> Saved!</>
                    : saving ? <><span className="acm-btn-spinner"/> Saving…</>
                    :          <><SaveIcon/> Save Carousel</>}
                </button>
            </div>
        </div>
    );
};

export default AdminCarouselManager;