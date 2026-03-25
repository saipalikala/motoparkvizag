import { useEffect, useState } from "react";
import "./AdminMedia.css";

// const API = "http://localhost:5000/api/media";
// const BASE = "http://localhost:5000";
import { API } from "@/config/api"; // ✅ ADD THIS

// ✅ FIXED
const MEDIA_API = `${API}/api/media`;
const BASE = API;

const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}` });

const UploadIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const CopyIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>;
const CheckIcon = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>;

/* What AdminMedia does:
   A media library for your store. Admin uploads images once,
   then copies their URL to use in other places (carousel, banners, etc.)
   without re-uploading every time. */

export default function AdminMedia() {
  const [media, setMedia] = useState([]);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState("");

  const load = async () => {
    try {
      const res = await fetch(MEDIA_API);
      const data = await res.json();
      setMedia(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const pickFile = (f) => {
    if (!f) return;
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    try {
      await fetch(MEDIA_API, { method: "POST", headers: AUTH(), body: fd });
      setFile(null); setPreview(null); load();
    } catch (e) { console.error(e); }
    finally { setUploading(false); }
  };

  const del = async (id) => {
    if (!confirm("Delete this image?")) return;
    await fetch(`${MEDIA_API}/${id}`, { method: "DELETE", headers: AUTH() });
    load();
  };

  const copyUrl = (url) => {
    const full = url.startsWith("http") ? url : `${BASE}/${url}`;
    navigator.clipboard.writeText(full);
    setCopied(url);
    setTimeout(() => setCopied(null), 2000);
  };

  const filtered = media.filter(m =>
    !search || m.url?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="am-page">

      {/* UPLOAD CARD */}
      <div className="am-upload-card">
        <h2 className="am-card-title">Media Library</h2>
        <p className="am-card-sub">Upload images once, copy their URL to use anywhere — carousel, banners, products.</p>

        <label
          className={`am-drop-zone ${dragOver ? "am-drop-zone--over" : ""} ${preview ? "am-drop-zone--preview" : ""}`}
          onDrop={e => { e.preventDefault(); setDragOver(false); pickFile(e.dataTransfer.files[0]); }}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
        >
          {preview ? (
            <img src={preview} alt="preview" className="am-preview-img" />
          ) : (
            <>
              <UploadIcon />
              <span>Drop image here or <strong>click to browse</strong></span>
              <span className="am-drop-hint">JPG, PNG, SVG, WebP · Max 5MB</span>
            </>
          )}
          <input type="file" accept="image/*" hidden onChange={e => pickFile(e.target.files[0])} />
        </label>

        {file && (
          <div className="am-upload-row">
            <span className="am-file-name">{file.name}</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="am-cancel-btn" onClick={() => { setFile(null); setPreview(null); }}>Cancel</button>
              <button className="am-upload-btn" onClick={upload} disabled={uploading}>
                {uploading ? <><span className="am-spinner" />Uploading…</> : <><UploadIcon /> Upload</>}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SEARCH + COUNT */}
      <div className="am-toolbar">
        <span className="am-count">{filtered.length} image{filtered.length !== 1 ? "s" : ""}</span>
        <input className="am-search" placeholder="Filter by filename…" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* GRID */}
      {loading ? (
        <div className="am-loading">Loading media…</div>
      ) : filtered.length === 0 ? (
        <div className="am-empty">{search ? "No images match your search" : "No images uploaded yet"}</div>
      ) : (
        <div className="am-grid">
          {filtered.map(item => {
            const url = item.url?.startsWith("http") ? item.url : `${BASE}/${item.url?.replace(/^\//, "")}`;
            const isCopied = copied === item.url;
            return (
              <div className="am-card" key={item._id}>
                <div className="am-img-wrap">
                  <img src={url} alt="" className="am-img" />
                  <div className="am-card-overlay">
                    <button className={`am-copy-btn ${isCopied ? "am-copy-btn--copied" : ""}`} onClick={() => copyUrl(item.url)}>
                      {isCopied ? <><CheckIcon /> Copied!</> : <><CopyIcon /> Copy URL</>}
                    </button>
                  </div>
                </div>
                <div className="am-card-footer">
                  <span className="am-filename">{item.url?.split("/").pop()}</span>
                  <button className="am-del-btn" onClick={() => del(item._id)}><TrashIcon /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}