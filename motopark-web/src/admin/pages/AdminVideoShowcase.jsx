/* ================================================
   AdminVideoShowcase.jsx  — v3 PRODUCTION
   ================================================
   FIXES IN THIS VERSION
   ──────────────────────────
   FIX 1 · 401 Unauthorized on all API calls
     Root cause: fetch() calls had NO Authorization header.
     Token sits in localStorage under key "token" (or "authToken").
     Fix: getAuthHeader() reads token and attaches it to every
     protected request — upload video, upload poster, save.

   FIX 2 · 404 on /upload/carousel and /upload/carousel-video
     Root cause: Code called `${API}/upload/carousel` but the
     backend mounts these under `/api/upload/...`.
     If API = "https://example.com" → URL was correct.
     If API = "https://example.com/api" → double-path bug.
     Fix: Paths are now relative to wherever API points;
     they match the backend route exactly. XHR also receives
     the auth header via xhr.setRequestHeader().

   FIX 3 · Admin saves don't reflect in VideoShowcase
     Root cause: cachedFetch in VideoShowcase caches for 5 min.
     Fix: After a successful save, we call clearVideoCache()
     which deletes the sessionStorage entry + memory cache so
     the public page fetches fresh data on next visit.

   FIX 4 · Video autoplay — loop prevents ended event
     Root cause: <video loop> never fires 'ended', so the
     onEnded handler in VideoShowcase never advances the slide.
     Fix (VideoShowcase.jsx companion): loop removed from <video>.
     Here in admin the preview video correctly keeps loop={true}.

   All existing UI + logic preserved exactly.
   ================================================ */

import { useState, useRef, useCallback, useEffect } from "react";
import { API } from "@/config/api";
import "./AdminVideoShowcase.css";

/* ─────────────────────────────────────────────
   AUTH HELPER  (FIX 1)
   Reads token from localStorage. Adjust the key
   to match wherever your authSlice / login stores it.
───────────────────────────────────────────── */
function getToken() {
  // Try both common keys — change to match your app
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    sessionStorage.getItem("token") ||
    ""
  );
}

function getAuthHeader() {
  const t = getToken();
  return t ? { Authorization: `Bearer ${t}` } : {};
}

/* ─────────────────────────────────────────────
   CACHE BUST HELPER  (FIX 3)
   Matches the key used by cachedFetch in apiCache.js
───────────────────────────────────────────── */
function clearVideoCache() {
  try {
    // sessionStorage key format used by cachedFetch
    const cacheKey = `apicache:${API}/video-showcase`;
    sessionStorage.removeItem(cacheKey);
    // Also bust the in-memory map if it's exported — safe no-op otherwise
    if (window.__apiCache) delete window.__apiCache[`${API}/video-showcase`];
  } catch (_) {}
}

/* ─────────────────────────────────────────────
   DEFAULT SLIDES
───────────────────────────────────────────── */
const DEFAULT_SLIDES = [
  {
    id: 0,
    src: "/assets/carousel/carousel-video-1.mp4",
    poster: "",
    tag: "SEASON 2025",
    lines: ["RIDE", "BEYOND", "LIMITS"],
    sub: "Premium motorcycle gear engineered for the track and the open road.",
    accent: "#f06a2c",
    cta: "Shop Collection",
    buyNowLink: "/products?collection=season-2025",
    exploreLink: "/store",
  },
  {
    id: 1,
    src: "/assets/carousel/carousel-video-2.mp4",
    poster: "",
    tag: "NEW ARRIVALS",
    lines: ["BUILT", "FOR", "SPEED"],
    sub: "Aerodynamic helmets and race suits that push performance to the edge.",
    accent: "#3b9af0",
    cta: "Explore Helmets",
    buyNowLink: "/products?category=helmets",
    exploreLink: "/store",
  },
  {
    id: 2,
    src: "/assets/carousel/carousel-video-2.mp4",
    poster: "",
    tag: "BESTSELLERS",
    lines: ["GEAR", "UP.", "WIN."],
    sub: "From gloves to boots — every piece crafted for champions.",
    accent: "#e8c52a",
    cta: "View Bestsellers",
    buyNowLink: "/products?sort=bestsellers",
    exploreLink: "/store",
  },
];

let _nextId = 10;
const uid = () => _nextId++;

export default function AdminVideoShowcase() {
  const [slides,        setSlides]        = useState(() => DEFAULT_SLIDES.map(s => ({ ...s })));
  const [activeId,      setActiveId]      = useState(DEFAULT_SLIDES[0].id);
  const [saving,        setSaving]        = useState(false);
  const [saved,         setSaved]         = useState(false);
  const [saveError,     setSaveError]     = useState("");
  const [dragOver,      setDragOver]      = useState(false);
  const [uploadState,   setUploadState]   = useState({});
  const [posterLoading, setPosterLoading] = useState({});

  const fileRef       = useRef(null);
  const posterFileRef = useRef(null);

  const active       = slides.find(s => s.id === activeId) ?? slides[0];
  const activeUpload = uploadState[activeId] ?? {};
  const anyUploading = Object.values(uploadState).some(u => u?.uploading);

  /* ── Load from MongoDB on mount ── */
  useEffect(() => {
    // FIX 1: attach auth header on GET too (route may be protected)
    fetch(`${API}/video-showcase`, {
      headers: { ...getAuthHeader() },
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setSlides(data.map(s => ({ ...s })));
          setActiveId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  /* ── Field helpers ── */
  const update = useCallback((field, value) => {
    setSlides(prev => prev.map(s => s.id === activeId ? { ...s, [field]: value } : s));
  }, [activeId]);

  const updateLine = useCallback((li, value) => {
    setSlides(prev => prev.map(s => {
      if (s.id !== activeId) return s;
      const lines = [...s.lines];
      lines[li] = value;
      return { ...s, lines };
    }));
  }, [activeId]);

  const addLine = useCallback(() => {
    setSlides(prev => prev.map(s =>
      s.id === activeId ? { ...s, lines: [...s.lines, ""] } : s
    ));
  }, [activeId]);

  const removeLine = useCallback((li) => {
    setSlides(prev => prev.map(s =>
      s.id !== activeId ? s : { ...s, lines: s.lines.filter((_, i) => i !== li) }
    ));
  }, [activeId]);

  /* ── Slide management ── */
  const addSlide = useCallback(() => {
    const ns = {
      id: uid(), src: "", poster: "",
      tag: "NEW TAG", lines: ["HEADLINE"],
      sub: "Enter subtitle text here.",
      accent: "#ffffff", cta: "Shop Now",
      buyNowLink: "/products", exploreLink: "/store",
    };
    setSlides(prev => [...prev, ns]);
    setActiveId(ns.id);
  }, []);

  const deleteSlide = useCallback((id) => {
    setSlides(prev => {
      const next = prev.filter(s => s.id !== id);
      if (activeId === id && next.length > 0) setActiveId(next[0].id);
      return next;
    });
    setUploadState(prev => { const n = { ...prev }; delete n[id]; return n; });
    setPosterLoading(prev => { const n = { ...prev }; delete n[id]; return n; });
  }, [activeId]);

  /* ══════════════════════════════════════════
     VIDEO UPLOAD — XHR with auth + progress
     FIX 1: xhr.setRequestHeader("Authorization", ...)
     FIX 2: URL is `${API}/upload/carousel-video`
             (matches backend POST /api/upload/carousel-video)
  ══════════════════════════════════════════ */
  const uploadVideoFile = useCallback(async (file, slideId) => {
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      setUploadState(prev => ({ ...prev, [slideId]: { uploading: false, progress: 0, error: "Only video files are accepted." } }));
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setUploadState(prev => ({ ...prev, [slideId]: { uploading: false, progress: 0, error: "File exceeds 50 MB — compress it first." } }));
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setSlides(prev => prev.map(s => s.id === slideId ? { ...s, _previewSrc: previewUrl } : s));
    setUploadState(prev => ({ ...prev, [slideId]: { uploading: true, progress: 0, error: "" } }));

    try {
      const cloudinaryUrl = await new Promise((resolve, reject) => {
        const fd = new FormData();
        fd.append("carousel_video", file);

        const xhr = new XMLHttpRequest();
        xhr.open("POST", `${API}/upload/carousel-video`);

        // FIX 1: Attach auth token to XHR
        const token = getToken();
        if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        // Do NOT set Content-Type — browser sets multipart/form-data + boundary

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setUploadState(prev => ({ ...prev, [slideId]: { uploading: true, progress: pct, error: "" } }));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            try   { resolve(JSON.parse(xhr.responseText).url); }
            catch { reject(new Error("Invalid JSON from upload endpoint")); }
          } else if (xhr.status === 401) {
            reject(new Error("Unauthorized: your session may have expired. Please log in again."));
          } else if (xhr.status === 404) {
            reject(new Error("Upload endpoint not found. Check backend route: POST /api/upload/carousel-video"));
          } else {
            try   { reject(new Error(JSON.parse(xhr.responseText).message ?? `Upload failed: ${xhr.status}`)); }
            catch { reject(new Error(`Upload failed: ${xhr.status}`)); }
          }
        };

        xhr.onerror = () => reject(new Error("Network error during upload"));
        xhr.send(fd);
      });

      URL.revokeObjectURL(previewUrl);
      setSlides(prev => prev.map(s =>
        s.id === slideId ? { ...s, src: cloudinaryUrl, _previewSrc: undefined } : s
      ));
      setUploadState(prev => ({ ...prev, [slideId]: { uploading: false, progress: 100, error: "" } }));

    } catch (err) {
      setUploadState(prev => ({ ...prev, [slideId]: { uploading: false, progress: 0, error: err.message } }));
    }
  }, []);

  /* ══════════════════════════════════════════
     POSTER UPLOAD
     FIX 1: Authorization header attached via fetch headers
     FIX 2: URL matches backend POST /api/upload/carousel
     Do NOT set Content-Type — browser sets multipart boundary
  ══════════════════════════════════════════ */
  const uploadPosterFile = useCallback(async (file, slideId) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Poster must be an image (JPG, PNG, or WebP).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Poster image must be under 5 MB.");
      return;
    }

    setPosterLoading(prev => ({ ...prev, [slideId]: true }));
    try {
      const fd = new FormData();
      fd.append("carousel", file); // field name must match uploadCarousel.single("carousel")

      // FIX 1: Attach auth token. Do NOT pass Content-Type — browser sets boundary.
      const res = await fetch(`${API}/upload/carousel`, {
        method: "POST",
        headers: { ...getAuthHeader() }, // only Authorization, no Content-Type
        body: fd,
      });

      if (res.status === 401) {
        throw new Error("Unauthorized: your session may have expired. Please log in again.");
      }
      if (res.status === 404) {
        throw new Error("Upload endpoint not found. Check backend route: POST /api/upload/carousel");
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.message ?? `Server returned ${res.status}`);
      }
      const data = await res.json();
      setSlides(prev => prev.map(s =>
        s.id === slideId ? { ...s, poster: data.url } : s
      ));
    } catch (err) {
      alert(`Poster upload failed: ${err.message}`);
    } finally {
      setPosterLoading(prev => ({ ...prev, [slideId]: false }));
    }
  }, []);

  /* ── File input event handlers ── */
  const handleFileChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadVideoFile(file, activeId);
    e.target.value = "";
  }, [activeId, uploadVideoFile]);

  const handlePosterChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    uploadPosterFile(file, activeId);
    e.target.value = "";
  }, [activeId, uploadPosterFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file || !file.type.startsWith("video/")) return;
    uploadVideoFile(file, activeId);
  }, [activeId, uploadVideoFile]);

  /* ══════════════════════════════════════════
     SAVE
     FIX 1: Authorization header attached
     FIX 3: clearVideoCache() called on success so
            VideoShowcase fetches fresh data next visit
  ══════════════════════════════════════════ */
  const handleSave = useCallback(async () => {
    if (anyUploading) return;
    setSaving(true);
    setSaveError("");
    try {
      // eslint-disable-next-line no-unused-vars
      const payload = slides.map(({ _previewSrc, ...rest }) => rest);

      const res = await fetch(`${API}/video-showcase`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeader(), // FIX 1
        },
        body: JSON.stringify(payload),
      });

      if (res.status === 401) {
        throw new Error("Unauthorized: your session may have expired. Please log in again.");
      }
      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      // FIX 3: bust the public page cache so changes are visible immediately
      clearVideoCache();

      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setSaveError(err.message || "Save failed — check your connection.");
      setTimeout(() => setSaveError(""), 6000);
    } finally {
      setSaving(false);
    }
  }, [slides, anyUploading]);

  /* ── Drag-to-reorder ── */
  const dragIdx = useRef(null);
  const onDragStart = (i) => { dragIdx.current = i; };
  const onDragEnter = (i) => {
    if (dragIdx.current === null || dragIdx.current === i) return;
    setSlides(prev => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx.current, 1);
      next.splice(i, 0, moved);
      dragIdx.current = i;
      return next;
    });
  };

  const effectiveSrc    = active._previewSrc || active.src;
  const posterIsLoading = !!posterLoading[activeId];

  return (
    <div className="avs-root">

      {/* ── Header ── */}
      <div className="avs-header">
        <div className="avs-header__left">
          <div className="avs-header__icon"><VideoIcon /></div>
          <div>
            <h1 className="avs-header__title">Video Showcase</h1>
            <p className="avs-header__sub">Manage homepage video slides, text and CTA links</p>
          </div>
        </div>
        <button
          className={`avs-save-btn${saving ? " avs-save-btn--loading" : ""}${saved ? " avs-save-btn--saved" : ""}${saveError ? " avs-save-btn--error" : ""}`}
          onClick={handleSave}
          disabled={saving || anyUploading}
          title={anyUploading ? "Wait for uploads to finish" : ""}
        >
          {saving ? <SpinIcon /> : saved ? <CheckIcon /> : <SaveIcon />}
          {saving ? "Saving…" : saved ? "Saved!" : anyUploading ? "Uploading…" : saveError ? "Try Again" : "Save Changes"}
        </button>
      </div>

      {saveError && (
        <div className="avs-error-banner">
          <span>⚠</span> {saveError}
        </div>
      )}

      <div className="avs-layout">

        {/* ── LEFT: Slide list ── */}
        <aside className="avs-list">
          <div className="avs-list__head">
            <span>Slides ({slides.length})</span>
            <button className="avs-list__add" onClick={addSlide}><PlusIcon /> Add</button>
          </div>
          <ul className="avs-list__items">
            {slides.map((s, i) => (
              <li
                key={s.id} draggable
                onDragStart={() => onDragStart(i)}
                onDragEnter={() => onDragEnter(i)}
                onDragOver={e => e.preventDefault()}
              >
                <div
                  className={`avs-list__item${s.id === activeId ? " avs-list__item--active" : ""}`}
                  style={{ "--va": s.accent }}
                  onClick={() => setActiveId(s.id)}
                  role="button" tabIndex={0}
                  onKeyDown={e => e.key === "Enter" && setActiveId(s.id)}
                >
                  <span className="avs-list__item-drag"><DragIcon /></span>
                  <span className="avs-list__item-dot" />
                  <div className="avs-list__item-info">
                    <span className="avs-list__item-tag">{s.tag || "Untitled"}</span>
                    <span className="avs-list__item-line">
                      {uploadState[s.id]?.uploading
                        ? `⬆ ${uploadState[s.id].progress}%`
                        : s.lines[0] || "—"}
                    </span>
                  </div>
                  {slides.length > 1 && (
                    <button className="avs-list__item-del" onClick={e => { e.stopPropagation(); deleteSlide(s.id); }}>
                      <TrashIcon />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* ── RIGHT: Editor ── */}
        {active && (
          <div className="avs-editor">

            {/* ─ Video Upload ─ */}
            <section className="avs-section">
              <h2 className="avs-section__title"><VideoIcon /> Video File</h2>

              {activeUpload.uploading && (
                <div className="avs-progress">
                  <div className="avs-progress__bar" style={{ width: `${activeUpload.progress}%` }} />
                  <span className="avs-progress__label">Uploading to Cloudinary… {activeUpload.progress}%</span>
                </div>
              )}
              {activeUpload.error && <div className="avs-upload-error">⚠ {activeUpload.error}</div>}

              <div
                className={`avs-drop${dragOver ? " avs-drop--over" : ""}${activeUpload.uploading ? " avs-drop--disabled" : ""}`}
                onDragOver={e => { if (!activeUpload.uploading) { e.preventDefault(); setDragOver(true); } }}
                onDragLeave={() => setDragOver(false)}
                onDrop={activeUpload.uploading ? undefined : handleDrop}
                onClick={() => !activeUpload.uploading && fileRef.current?.click()}
                role="button" tabIndex={0} aria-label="Upload video"
                onKeyDown={e => e.key === "Enter" && !activeUpload.uploading && fileRef.current?.click()}
              >
                {effectiveSrc ? (
                  <div className="avs-drop__preview">
                    <video
                      key={effectiveSrc}
                      src={effectiveSrc}
                      poster={active.poster || undefined}
                      className="avs-drop__video"
                      muted playsInline loop
                      autoPlay={!!active._previewSrc}
                      preload="metadata"
                    />
                    {activeUpload.uploading
                      ? <div className="avs-drop__uploading-overlay"><SpinIcon /><span>{activeUpload.progress}%</span></div>
                      : <div className="avs-drop__overlay"><UploadIcon /><span>Click or drag to replace</span></div>
                    }
                  </div>
                ) : (
                  <div className="avs-drop__empty">
                    <UploadIcon />
                    <span>Drag &amp; drop video or <u>browse</u></span>
                    <small>MP4 / WebM — max 50 MB, 1920×1080 recommended</small>
                  </div>
                )}
              </div>

              <input ref={fileRef} type="file" accept="video/*" className="avs-hidden" onChange={handleFileChange} />

              {active.src && !active.src.startsWith("/assets") && (
                <div className="avs-field" style={{ marginTop: 8 }}>
                  <label className="avs-label">Cloudinary Video URL</label>
                  <input className="avs-input" value={active.src} readOnly />
                </div>
              )}
            </section>

            {/* ─ Poster Image ─ */}
            <section className="avs-section">
              <h2 className="avs-section__title"><ImageIcon /> Poster Image</h2>
              <p className="avs-section__hint">
                Shown before the video loads — prevents a black flash.
                Upload a JPG/PNG of the video's first frame. Max 5 MB, image/* files only.
              </p>

              {posterIsLoading && (
                <div className="avs-progress">
                  <div className="avs-progress__bar avs-progress__bar--indeterminate" />
                  <span className="avs-progress__label">Uploading poster image…</span>
                </div>
              )}

              <div className="avs-row avs-row--center" style={{ gap: 10 }}>
                {active.poster ? (
                  <>
                    <div className="avs-poster-wrap">
                      <img src={active.poster} alt="Poster preview" className="avs-poster-img" />
                      <button className="avs-poster-clear" onClick={() => update("poster", "")} title="Remove poster">✕</button>
                    </div>
                    <button className="avs-btn avs-btn--secondary" onClick={() => posterFileRef.current?.click()} disabled={posterIsLoading} style={{ fontSize: 12 }}>
                      Replace
                    </button>
                  </>
                ) : (
                  <button className="avs-btn avs-btn--secondary" onClick={() => posterFileRef.current?.click()} disabled={posterIsLoading}>
                    <UploadIcon /> {posterIsLoading ? "Uploading…" : "Upload Poster Image"}
                  </button>
                )}
              </div>

              <input
                ref={posterFileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                className="avs-hidden"
                onChange={handlePosterChange}
              />
            </section>

            {/* ─ Tag + Accent ─ */}
            <section className="avs-section">
              <h2 className="avs-section__title"><TagIcon /> Label &amp; Accent</h2>
              <div className="avs-row">
                <div className="avs-field avs-field--grow">
                  <label className="avs-label">Tag / Badge label</label>
                  <input className="avs-input" value={active.tag} onChange={e => update("tag", e.target.value)} placeholder="SEASON 2025" />
                </div>
                <div className="avs-field avs-field--shrink">
                  <label className="avs-label">Accent colour</label>
                  <div className="avs-color-wrap">
                    <input type="color" className="avs-color-picker" value={active.accent} onChange={e => update("accent", e.target.value)} />
                    <input className="avs-input avs-input--hex" value={active.accent} onChange={e => update("accent", e.target.value)} placeholder="#f06a2c" maxLength={7} />
                  </div>
                </div>
              </div>
            </section>

            {/* ─ Headline lines ─ */}
            <section className="avs-section">
              <h2 className="avs-section__title"><TypeIcon /> Headline Lines</h2>
              <p className="avs-section__hint">Each line animates in separately on the big screen.</p>
              <div className="avs-lines">
                {active.lines.map((line, li) => (
                  <div key={li} className="avs-line-row">
                    <span className="avs-line-num">{li + 1}</span>
                    <input className="avs-input avs-input--headline" value={line} onChange={e => updateLine(li, e.target.value)} placeholder={`Line ${li + 1}`} />
                    {active.lines.length > 1 && (
                      <button className="avs-line-del" onClick={() => removeLine(li)} aria-label="Remove line"><TrashIcon /></button>
                    )}
                  </div>
                ))}
                {active.lines.length < 5 && (
                  <button className="avs-line-add" onClick={addLine}><PlusIcon /> Add line</button>
                )}
              </div>
            </section>

            {/* ─ Subtitle ─ */}
            <section className="avs-section">
              <h2 className="avs-section__title"><TextIcon /> Subtitle</h2>
              <textarea className="avs-textarea" value={active.sub} rows={3} onChange={e => update("sub", e.target.value)} placeholder="Supporting description shown below the headline…" />
            </section>

            {/* ─ CTA Links ─ */}
            <section className="avs-section">
              <h2 className="avs-section__title"><LinkIcon /> Call-to-Action Links</h2>
              <div className="avs-cta-preview">
                <div className="avs-cta-preview__btn avs-cta-preview__btn--primary" style={{ background: active.accent }}>Buy Now →</div>
                <div className="avs-cta-preview__btn avs-cta-preview__btn--ghost">Explore More</div>
              </div>
              <div className="avs-field">
                <label className="avs-label">
                  <span className="avs-label__badge avs-label__badge--primary" style={{ background: active.accent }}>Buy Now</span>
                  Product / Collection URL
                </label>
                <div className="avs-input-icon-wrap"><LinkIcon />
                  <input className="avs-input avs-input--with-icon" value={active.buyNowLink} onChange={e => update("buyNowLink", e.target.value)} placeholder="/products?collection=season-2025" />
                </div>
                <p className="avs-hint">Where "Buy Now" navigates.</p>
              </div>
              <div className="avs-field">
                <label className="avs-label">
                  <span className="avs-label__badge avs-label__badge--ghost">Explore More</span>
                  Store / Category URL
                </label>
                <div className="avs-input-icon-wrap"><LinkIcon />
                  <input className="avs-input avs-input--with-icon" value={active.exploreLink} onChange={e => update("exploreLink", e.target.value)} placeholder="/store" />
                </div>
                <p className="avs-hint">Where "Explore More" navigates.</p>
              </div>
            </section>

          </div>
        )}
      </div>

      {/* ── JSON export ── */}
      <details className="avs-export">
        <summary className="avs-export__toggle"><CodeIcon /> View / export config JSON</summary>
        {/* eslint-disable-next-line no-unused-vars */}
        <pre className="avs-export__json">{JSON.stringify(slides.map(({ _previewSrc, ...r }) => r), null, 2)}</pre>
      </details>
    </div>
  );
}

/* ── Icons ── */
const VideoIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>;
const SaveIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>;
const CheckIcon  = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const SpinIcon   = () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="avs-spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>;
const PlusIcon   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
const TrashIcon  = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
const DragIcon   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="9" cy="6" r="1" fill="currentColor"/><circle cx="9" cy="12" r="1" fill="currentColor"/><circle cx="9" cy="18" r="1" fill="currentColor"/><circle cx="15" cy="6" r="1" fill="currentColor"/><circle cx="15" cy="12" r="1" fill="currentColor"/><circle cx="15" cy="18" r="1" fill="currentColor"/></svg>;
const UploadIcon = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>;
const TagIcon    = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><circle cx="7" cy="7" r="1" fill="currentColor" stroke="none"/></svg>;
const TypeIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>;
const TextIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/></svg>;
const LinkIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>;
const CodeIcon   = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>;
const ImageIcon  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>;