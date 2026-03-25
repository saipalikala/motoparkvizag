import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import PageTransition from "../../components/PageTransition/PageTransition";
import "./AccountPage.css";

import { API } from "@/config/api";

/* ─── ICONS ─── */
const UserIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const OrdersIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /></svg>;
const PinIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" /></svg>;
const LogoutIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>;
const EditIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>;
const PlusIcon = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>;
const TrashIcon = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /></svg>;
const ChevronRight = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>;

const INDIAN_STATES = ["Andhra Pradesh", "Delhi", "Goa", "Gujarat", "Karnataka", "Kerala", "Maharashtra", "Rajasthan", "Tamil Nadu", "Telangana", "Uttar Pradesh", "West Bengal"];

const AccountPage = () => {
    const navigate = useNavigate();
    const { user, token, logout, updateUser } = useUser();

    const [tab, setTab] = useState("profile");
    const [profileForm, setProfileForm] = useState({ name: user?.name || "", email: user?.email || "" });
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [addrForm, setAddrForm] = useState(null); // null = hidden, {} = new address form
    const [fullUser, setFullUser] = useState(null);

    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    /* Load full profile from server */
    useEffect(() => {
        if (!token) return;
        fetch(`${API}/api/users/profile`, { headers })
            .then(r => r.json())
            .then(d => { if (d.user) { setFullUser(d.user); setProfileForm({ name: d.user.name, email: d.user.email || "" }); } })
            .catch(console.error);
    }, [token]);

    /* Redirect if not logged in */
    useEffect(() => {
        if (!user) { sessionStorage.setItem("authRedirect", "/account"); navigate("/login"); }
    }, [user]);

    if (!user) return null;

    const displayUser = fullUser || user;
    const firstName = displayUser.name?.split(" ")[0] || "User";

    /* SAVE PROFILE */
    const saveProfile = async (e) => {
        e.preventDefault(); setSaving(true);
        try {
            const res = await fetch(`${API}/api/users/profile`, { method: "PUT", headers, body: JSON.stringify(profileForm) });
            const data = await res.json();
            if (data.user) { updateUser(data.user); setFullUser(data.user); setSaved(true); setTimeout(() => setSaved(false), 2000); }
        } catch { /* handle */ }
        finally { setSaving(false); }
    };

    /* ADD ADDRESS */
    const addAddress = async () => {
        if (!addrForm?.name || !addrForm?.address || !addrForm?.city) return;
        try {
            const res = await fetch(`${API}/api/users/addresses`, { method: "POST", headers, body: JSON.stringify(addrForm) });
            const data = await res.json();
            if (data.user) { setFullUser(data.user); updateUser(data.user); setAddrForm(null); }
        } catch { /* handle */ }
    };

    /* DELETE ADDRESS */
    const deleteAddress = async (id) => {
        if (!confirm("Remove this address?")) return;
        try {
            const res = await fetch(`${API}/api/users/addresses/${id}`, { method: "DELETE", headers });
            const data = await res.json();
            if (data.user) { setFullUser(data.user); updateUser(data.user); }
        } catch { /* handle */ }
    };

    const handleLogout = () => { logout(); navigate("/"); };

    return (
        <PageTransition>
            <div className="acc-page">
                {/* ── HERO ── */}
                <div className="acc-hero">
                    <div className="acc-hero-bg" aria-hidden="true" />
                    <div className="acc-hero-content">
                        <div className="acc-hero-avatar">{firstName.charAt(0).toUpperCase()}</div>
                        <div>
                            <h1 className="acc-hero-name">{displayUser.name}</h1>
                            <p className="acc-hero-sub">{displayUser.email || `+91 ${displayUser.phone}`}</p>
                        </div>
                    </div>
                </div>

                <div className="acc-container">
                    {/* ── TAB NAV ── */}
                    <div className="acc-tabs">
                        {[["profile", "Profile", <UserIcon />], ["addresses", "Addresses", <PinIcon />]].map(([id, label, icon]) => (
                            <button key={id} className={`acc-tab ${tab === id ? "acc-tab--active" : ""}`} onClick={() => setTab(id)}>
                                {icon} {label}
                            </button>
                        ))}
                    </div>

                    <div className="acc-body">

                        {/* ── PROFILE TAB ── */}
                        {tab === "profile" && (
                            <div className="acc-section">
                                <h2 className="acc-section-title">Personal Info</h2>
                                <form className="acc-form" onSubmit={saveProfile}>
                                    <div className="acc-field-row">
                                        <div className="acc-field">
                                            <label>Full Name</label>
                                            <input value={profileForm.name}
                                                onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
                                                placeholder="Your full name" />
                                        </div>
                                        <div className="acc-field">
                                            <label>Email</label>
                                            <input type="email" value={profileForm.email}
                                                onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
                                                placeholder="your@email.com" />
                                        </div>
                                    </div>
                                    <div className="acc-field acc-field--readonly">
                                        <label>Phone</label>
                                        <input value={displayUser.phone ? `+91 ${displayUser.phone}` : "Not set"} disabled />
                                    </div>
                                    <button type="submit" className={`acc-save-btn ${saved ? "acc-save-btn--saved" : ""}`} disabled={saving}>
                                        {saved ? "✓ Saved!" : saving ? "Saving…" : "Save Changes"}
                                    </button>
                                </form>

                                {/* QUICK LINKS */}
                                <div className="acc-quick-links">
                                    <Link to="/orders" className="acc-quick-link">
                                        <div className="acc-quick-link-icon"><OrdersIcon /></div>
                                        <div>
                                            <span className="acc-quick-link-label">My Orders</span>
                                            <span className="acc-quick-link-sub">Track your deliveries</span>
                                        </div>
                                        <ChevronRight />
                                    </Link>
                                </div>

                                {/* LOGOUT */}
                                <button className="acc-logout-btn" onClick={handleLogout}>
                                    <LogoutIcon /> Sign Out
                                </button>
                            </div>
                        )}

                        {/* ── ADDRESSES TAB ── */}
                        {tab === "addresses" && (
                            <div className="acc-section">
                                <div className="acc-section-header">
                                    <h2 className="acc-section-title">Saved Addresses</h2>
                                    {!addrForm && (
                                        <button className="acc-add-addr-btn" onClick={() => setAddrForm({ label: "Home", name: displayUser.name || "", phone: displayUser.phone || "", address: "", city: "", state: "", pincode: "" })}>
                                            <PlusIcon /> Add Address
                                        </button>
                                    )}
                                </div>

                                {/* ADDRESS LIST */}
                                {(displayUser.savedAddresses || []).length === 0 && !addrForm && (
                                    <div className="acc-empty">
                                        <PinIcon />
                                        <p>No saved addresses yet</p>
                                        <button className="acc-add-addr-btn" onClick={() => setAddrForm({ label: "Home", name: displayUser.name || "", phone: "", address: "", city: "", state: "", pincode: "" })}>
                                            <PlusIcon /> Add Your First Address
                                        </button>
                                    </div>
                                )}

                                <div className="acc-addr-list">
                                    {(displayUser.savedAddresses || []).map(addr => (
                                        <div key={addr._id} className="acc-addr-card">
                                            <div className="acc-addr-top">
                                                <span className="acc-addr-label">{addr.label || "Home"}</span>
                                                {String(addr._id) === String(displayUser.defaultAddress) && (
                                                    <span className="acc-addr-default">Default</span>
                                                )}
                                                <button className="acc-addr-del" onClick={() => deleteAddress(addr._id)}><TrashIcon /></button>
                                            </div>
                                            <p className="acc-addr-name">{addr.name}</p>
                                            <p className="acc-addr-text">{addr.address}, {addr.city}, {addr.state} – {addr.pincode}</p>
                                            <p className="acc-addr-phone">{addr.phone}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* ADD FORM */}
                                {addrForm && (
                                    <div className="acc-addr-form">
                                        <h3>New Address</h3>
                                        <div className="acc-field-row">
                                            <div className="acc-field">
                                                <label>Label</label>
                                                <select value={addrForm.label} onChange={e => setAddrForm(f => ({ ...f, label: e.target.value }))}>
                                                    {["Home", "Work", "Other"].map(l => <option key={l}>{l}</option>)}
                                                </select>
                                            </div>
                                            <div className="acc-field">
                                                <label>Name *</label>
                                                <input placeholder="Full name" value={addrForm.name} onChange={e => setAddrForm(f => ({ ...f, name: e.target.value }))} />
                                            </div>
                                        </div>
                                        <div className="acc-field">
                                            <label>Address *</label>
                                            <textarea rows={2} placeholder="House no, Street, Area" value={addrForm.address} onChange={e => setAddrForm(f => ({ ...f, address: e.target.value }))} />
                                        </div>
                                        <div className="acc-field-row">
                                            <div className="acc-field"><label>City *</label><input placeholder="City" value={addrForm.city} onChange={e => setAddrForm(f => ({ ...f, city: e.target.value }))} /></div>
                                            <div className="acc-field"><label>Pincode *</label><input placeholder="6-digit" maxLength={6} value={addrForm.pincode} onChange={e => setAddrForm(f => ({ ...f, pincode: e.target.value.replace(/\D/, "") }))} /></div>
                                        </div>
                                        <div className="acc-field">
                                            <label>State</label>
                                            <select value={addrForm.state} onChange={e => setAddrForm(f => ({ ...f, state: e.target.value }))}>
                                                <option value="">Select state</option>
                                                {INDIAN_STATES.map(s => <option key={s}>{s}</option>)}
                                            </select>
                                        </div>
                                        <div className="acc-addr-form-btns">
                                            <button type="button" className="acc-cancel-btn" onClick={() => setAddrForm(null)}>Cancel</button>
                                            <button type="button" className="acc-save-btn" onClick={addAddress}>Save Address</button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageTransition>
    );
};

export default AccountPage;