/**
 * AdminCarouselManager.jsx  — Production build
 *
 * FIXED ISSUES (from debugging sessions):
 * ─────────────────────────────────────────────────────────────────
 * 1. VIDEO ENDPOINT/FIELD  Images → /upload/carousel  field:"carousel"
 *                          Videos → /upload/carousel-video  field:"carousel_video"
 * 2. FILE SIZE LIMITS      Image ≤ 1 MB,  Video ≤ 5 MB (client + server)
 * 3. VIDEO PREVIEW         <video preload="metadata"> shows first frame
 * 4. CSS CLASS ALIGNMENT   All JSX class names match AdminCarouselManager.css
 * 5. ENFORCED SLOT ORDER   image→video→image→video→image, position-locked badges
 * 6. REAL UPLOAD PROGRESS  XHR onprogress drives per-slot progress bar
 * 7. SAVE DEDUPLICATION    Re-fetch after save to hydrate _id fields
 * 8. MISSING api_key ROOT  CLOUDINARY_URL env var now set in cloudinary.js;
 *                          no frontend change needed — just upload works.
 */

import { useEffect, useState, useRef, useCallback, memo } from "react";
import "./AdminCarouselManager.css";
import { API } from "@/config/api";

/* ─── Auth ─── */
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH  = () => ({ Authorization: `Bearer ${TOKEN()}` });

/* ─── Endpoints ─── */
const IMG_ENDPOINT   = "/upload/carousel";
const IMG_FIELD      = "carousel";
const VID_ENDPOINT   = "/upload/carousel-video";
const VID_FIELD      = "carousel_video";

/* ─── Limits (must match cloudinary.js) ─── */
const MAX_IMAGE_MB = 1;
const MAX_VIDEO_MB = 5;

/* ─── Fixed 5-slot pattern ─── */
const SLOT_TYPES = ["image","video","image","video","image"];
const MAX_SLOTS  = SLOT_TYPES.length;
const slotType   = (i) => SLOT_TYPES[i] ?? "image";

/* ─── Resolve Cloudinary / relative URLs ─── */
const url = (src) => {
    if (!src) return "";
    if (/^https?:\/\/|^\/assets|^data:/.test(src)) return src;
    return `${API}${src.startsWith("/") ? "" : "/"}${src}`;
};

/* ─── Client-side validation ─── */
const validate = (file, type) => {
    if (!file) return "No file selected.";
    if (type === "image") {
        if (!file.type.startsWith("image/"))
            return `Expected an image, got "${file.type}".`;
        if (file.size > MAX_IMAGE_MB * 1024 * 1024)
            return `Image is ${(file.size/1024/1024).toFixed(1)} MB — max ${MAX_IMAGE_MB} MB.`;
    }
    if (type === "video") {
        if (!file.type.startsWith("video/"))
            return `Expected a video file, got "${file.type}".`;
        if (file.size > MAX_VIDEO_MB * 1024 * 1024)
            return `Video is ${(file.size/1024/1024).toFixed(1)} MB — max ${MAX_VIDEO_MB} MB.`;
    }
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
const FilmIcon  = () => (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="2" width="20" height="20" rx="2"/>
        <line x1="7" y1="2" x2="7" y2="22"/><line x1="17" y1="2" x2="17" y2="22"/>
        <line x1="2" y1="12" x2="22" y2="12"/>
    </svg>
);
const ImgIcon   = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
        <circle cx="8.5" cy="8.5" r="1.5"/>
        <polyline points="21 15 16 10 5 21"/>
    </svg>
);
const InfoIcon  = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
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
   VIDEO PREVIEW  — <video preload="metadata"> shows first frame
══════════════════════════════════════ */
const VideoPreview = memo(({ src }) => {
    const [failed, setFailed] = useState(false);
    if (failed) return (
        <div className="acm-video-preview" style={{ display:"flex",alignItems:"center",justifyContent:"center" }}>
            <span style={{ fontSize:11,color:"rgba(255,255,255,0.5)",padding:"8px",textAlign:"center" }}>
                Preview unavailable
            </span>
        </div>
    );
    return (
        <div className="acm-video-preview">
            <video className="acm-preview-video" src={url(src)}
                   muted playsInline preload="metadata"
                   onError={() => setFailed(true)}/>
            <div className="acm-video-play-badge" aria-hidden="true">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
            </div>
            <span className="acm-video-label">VIDEO</span>
        </div>
    );
});
VideoPreview.displayName = "VideoPreview";

/* ══════════════════════════════════════
   DROP ZONE
══════════════════════════════════════ */
const DropZone = memo(({ mediaType, value, uploadState, onFile, onClear }) => {
    const inputRef  = useRef(null);
    const [drag,  setDrag]  = useState(false);
    const [error, setError] = useState(null);

    const accept = mediaType === "video"
        ? "video/mp4,video/webm,video/ogg,video/*"
        : "image/jpeg,image/png,image/webp,image/gif,image/*";

    const handleFile = useCallback((file) => {
        setError(null);
        const err = validate(file, mediaType);
        if (err) { setError(err); return; }
        onFile(file);
    }, [mediaType, onFile]);

    const hasVal = Boolean(value);
    const cls = ["acm-drop",
        drag        ? "acm-drop--drag"      : "",
        uploadState ? "acm-drop--uploading" : "",
        hasVal && !uploadState ? "acm-drop--has-img" : "",
        mediaType === "video"  ? "acm-drop--video"   : "",
    ].filter(Boolean).join(" ");

    return (
        <div className="acm-dropzone-wrap">
            <div className={cls}
                 onDragOver={e  => { e.preventDefault(); setDrag(true); }}
                 onDragLeave={() => setDrag(false)}
                 onDrop={e => { e.preventDefault(); setDrag(false); const f=e.dataTransfer.files?.[0]; if(f) handleFile(f); }}
                 onClick={() => !uploadState && inputRef.current?.click()}
                 role="button" tabIndex={uploadState ? -1 : 0}
                 onKeyDown={e => e.key==="Enter" && !uploadState && inputRef.current?.click()}
            >
                {uploadState && <ProgressBar progress={uploadState.progress} label={uploadState.label}/>}

                {!uploadState && hasVal && (
                    mediaType === "video"
                        ? <VideoPreview src={value}/>
                        : <img src={url(value)} alt="preview" className="acm-preview-img"/>
                )}

                {!uploadState && !hasVal && (
                    <>
                        {mediaType === "video"
                            ? <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(11,29,58,.2)" strokeWidth="1.5" strokeLinecap="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
                            : <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="rgba(11,29,58,.2)" strokeWidth="1.5" strokeLinecap="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                        }
                        <span>Drop {mediaType} or <strong>click to browse</strong></span>
                        <span className="acm-drop-hint">
                            {mediaType === "video"
                                ? `MP4 / WebM · max ${MAX_VIDEO_MB} MB`
                                : `JPG, PNG, WebP · max ${MAX_IMAGE_MB} MB`}
                        </span>
                    </>
                )}

                <input ref={inputRef} type="file" accept={accept} hidden
                       onClick={e => { e.target.value = ""; }}
                       onChange={e => { const f=e.target.files?.[0]; if(f) handleFile(f); }}/>
            </div>

            {error && <p className="acm-drop-error" role="alert">⚠ {error}</p>}

            {hasVal && !uploadState && (
                <button className="acm-change-img" type="button"
                        onClick={e => { e.stopPropagation(); onClear(); }}>
                    ✕ Remove {mediaType}
                </button>
            )}
        </div>
    );
});
DropZone.displayName = "DropZone";

/* ══════════════════════════════════════
   SLIDE CARD
══════════════════════════════════════ */
const SlideCard = memo(({ slide, index, uploadMap, onSet, onUpload, onDelete }) => {
    const isVideo  = slide.type === "video";
    const imgState = uploadMap[`${index}_image`] ?? null;
    const vidState = uploadMap[`${index}_video`] ?? null;

    return (
        <div className={`acm-slide ${isVideo ? "acm-slide--video" : ""}`}>
            <div className="acm-slide-num">{index + 1}</div>

            <div className="acm-img-section">
                {/* Position-locked type badge — read-only */}
                <div className="acm-type-toggle" role="group">
                    <span className={`acm-type-btn ${!isVideo ? "acm-type-btn--active" : ""}`}>
                        <ImgIcon/> Image
                    </span>
                    <span className={`acm-type-btn acm-type-btn--video ${isVideo ? "acm-type-btn--active" : ""}`}>
                        <FilmIcon/> Video
                    </span>
                </div>

                <p className="acm-media-label">
                    {isVideo ? "Poster Image" : "Background Image"}
                    {isVideo && <span className="acm-media-badge">shown while video loads</span>}
                </p>
                <DropZone mediaType="image" value={slide.image} uploadState={imgState}
                          onFile={f => onUpload(f, index, "image")}
                          onClear={() => onSet(index, "image", "")}/>

                {isVideo && (
                    <>
                        <p className="acm-media-label acm-media-label--video">
                            Video File
                            <span className="acm-media-badge acm-media-badge--video">MP4 · WebM</span>
                        </p>
                        <DropZone mediaType="video" value={slide.video} uploadState={vidState}
                                  onFile={f => onUpload(f, index, "video")}
                                  onClear={() => onSet(index, "video", "")}/>
                        <div className="acm-video-tip">
                            <InfoIcon/>
                            <span>Poster image displays while video loads and acts as fallback on slow connections.</span>
                        </div>
                    </>
                )}
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
                                       e.target.value.replace(/\/category\//g,"").replace(/\//g,"").trim().toLowerCase()
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
    const [slides,    setSlides]    = useState([]);
    const [saving,    setSaving]    = useState(false);
    const [saved,     setSaved]     = useState(false);
    /* uploadMap: key = "slideIndex_mediaType" → { progress, label } | null */
    const [uploadMap, setUploadMap] = useState({});

    /* Fetch + enforce slot types */
    useEffect(() => {
        fetch(`${API}/carousel`)
            .then(r => r.json())
            .then(data => {
                if (!Array.isArray(data)) return;
                setSlides(data.map((s, i) => ({ ...s, type: slotType(i) })));
            })
            .catch(console.error);
    }, []);

    const set = useCallback((i, k, v) => {
        setSlides(ss => ss.map((s, j) => j === i ? { ...s, [k]: v } : s));
    }, []);

    const addSlide = useCallback(() => {
        setSlides(ss => {
            if (ss.length >= MAX_SLOTS) return ss;
            return [...ss, { title:"", subtitle:"", route:"", cta:"", image:"", video:"", type: slotType(ss.length) }];
        });
    }, []);

    const deleteSlide = useCallback(async (slide, i) => {
        if (!confirm(`Delete slide ${i + 1}?`)) return;
        if (slide._id) {
            await fetch(`${API}/carousel/${slide._id}`, { method:"DELETE", headers: AUTH() }).catch(console.error);
        }
        setSlides(ss => ss.filter((_,j) => j !== i).map((s, idx) => ({ ...s, type: slotType(idx) })));
    }, []);

    const upload = useCallback(async (file, slideIndex, mediaType) => {
        const key      = `${slideIndex}_${mediaType}`;
        const endpoint = mediaType === "video" ? VID_ENDPOINT : IMG_ENDPOINT;
        const field    = mediaType === "video" ? VID_FIELD    : IMG_FIELD;

        const setProgress = (progress) => {
            setUploadMap(m => ({ ...m, [key]: {
                progress,
                label: progress < 100 ? `Uploading… ${progress}%` : "Processing…",
            }}));
        };

        setProgress(0);
        try {
            const uploadedUrl = await xhrUpload({ file, endpoint, field, token: TOKEN(), onProgress: setProgress });
            set(slideIndex, mediaType, uploadedUrl);
        } catch (err) {
            console.error(`[ACM] ${mediaType} upload error:`, err.message);
            alert(`Upload failed: ${err.message}`);
        } finally {
            setUploadMap(m => { const n={...m}; delete n[key]; return n; });
        }
    }, [set]);

    const save = async () => {
        setSaving(true);
        try {
            for (const slide of slides) {
                const body    = JSON.stringify(slide);
                const headers = { ...AUTH(), "Content-Type": "application/json" };
                if (slide._id) {
                    await fetch(`${API}/carousel/${slide._id}`, { method:"PUT", headers, body });
                } else {
                    await fetch(`${API}/carousel`, { method:"POST", headers, body });
                }
            }
            const fresh = await fetch(`${API}/carousel`).then(r => r.json());
            if (Array.isArray(fresh)) setSlides(fresh.map((s,i) => ({ ...s, type: slotType(i) })));
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
                    <p className="acm-eyebrow">{slides.length}/{MAX_SLOTS} slides</p>
                    <p className="acm-hint">Fixed order: Image → Video → Image → Video → Image</p>
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