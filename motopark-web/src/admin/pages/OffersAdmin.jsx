import { useEffect, useState } from "react";
import "./OffersAdmin.css";

const API = "http://localhost:5000/api/offers";
const TOKEN = () => localStorage.getItem("adminToken");
const AUTH = () => ({ Authorization: `Bearer ${TOKEN()}`, "Content-Type": "application/json" });

const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const TagIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" /><line x1="7" y1="7" x2="7.01" y2="7" /></svg>;

/* Tip: write offers as "SALE: text here" to show a tag badge in the offer bar */
const EXAMPLES = [
  "SALE: Flat 20% off on all helmets — use code RIDE20",
  "FREE: Free delivery on orders above ₹999",
  "NEW: New arrivals just dropped — Jackets & Gloves",
  "DEAL: Buy 2 get 1 free on riding gloves this weekend",
];

export default function OffersAdmin() {
  const [offers, setOffers] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await fetch(API);
      const data = await res.json();
      setOffers(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!text.trim()) return;
    setSaving(true);
    try {
      await fetch(API, { method: "POST", headers: AUTH(), body: JSON.stringify({ text }) });
      setText(""); load();
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const del = async (id) => {
    await fetch(`${API}/${id}`, { method: "DELETE", headers: AUTH() });
    load();
  };

  /* parse optional TAG: prefix */
  const parseOffer = (t) => {
    const idx = t?.indexOf(":");
    if (idx > 0 && idx < 10) return { tag: t.slice(0, idx).trim(), body: t.slice(idx + 1).trim() };
    return { tag: null, body: t };
  };

  return (
    <div className="oa-page">

      {/* ADD CARD */}
      <div className="oa-card">
        <h2 className="oa-card-title">Offer Bar Manager</h2>
        <p className="oa-card-sub">
          These messages rotate in the offer bar at the top of your site.
          Start with a tag like <code>SALE:</code> or <code>FREE:</code> to show a colored pill.
        </p>

        <div className="oa-add-row">
          <input
            className="oa-input"
            placeholder="SALE: Flat 20% off on all helmets — use code RIDE20"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => e.key === "Enter" && add()}
          />
          <button className="oa-add-btn" onClick={add} disabled={!text.trim() || saving}>
            <PlusIcon /> {saving ? "Adding…" : "Add"}
          </button>
        </div>

        {/* EXAMPLES */}
        <div className="oa-examples">
          <p className="oa-examples-label">Quick examples:</p>
          <div className="oa-examples-pills">
            {EXAMPLES.map((ex, i) => (
              <button key={i} className="oa-example-pill" onClick={() => setText(ex)}>
                {ex.split(":")[0]}…
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* OFFERS LIST */}
      <div className="oa-card">
        <h2 className="oa-card-title">
          Active Offers
          <span className="oa-count">{offers.length}</span>
        </h2>

        {loading ? (
          <div className="oa-loading">Loading…</div>
        ) : offers.length === 0 ? (
          <div className="oa-empty">No offers yet — add one above</div>
        ) : (
          <div className="oa-list">
            {offers.map((offer, i) => {
              const { tag, body } = parseOffer(offer.text);
              return (
                <div className="oa-row" key={offer._id}>
                  <div className="oa-row-left">
                    <div className="oa-row-num">{i + 1}</div>
                    <div className="oa-row-content">
                      {tag && <span className="oa-tag">{tag}</span>}
                      <span className="oa-body">{body}</span>
                    </div>
                  </div>
                  <button className="oa-del-btn" onClick={() => del(offer._id)}>
                    <TrashIcon />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* PREVIEW */}
      {offers.length > 0 && (
        <div className="oa-preview-card">
          <p className="oa-preview-label">Preview — how it looks in the offer bar</p>
          <div className="oa-preview-bar">
            <div className="oa-preview-dot" />
            <span className="oa-preview-text">Offers</span>
            <div className="oa-preview-sep" />
            {(() => {
              const { tag, body } = parseOffer(offers[0]?.text);
              return <><>{tag && <span className="oa-preview-tag">{tag}</span>}</>{body}</>;
            })()}
          </div>
        </div>
      )}

    </div>
  );
}