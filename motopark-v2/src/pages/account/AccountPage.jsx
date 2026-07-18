import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { LogOut, Plus, Trash2, Check } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import Field from '@/components/ui/Field.jsx';
import OrderHistory from '@/features/account/OrderHistory.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { updateProfile, saveAddress, deleteAddress } from '@/services/account.js';
import { INDIAN_STATES } from '@/config/geo.js';
import styles from './AccountPage.module.css';

const EMPTY_ADDR = { name: '', phone: '', address: '', city: '', state: '', pincode: '' };

export default function AccountPage() {
  const { user, isAuthed, logout, applyUser } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [savedName, setSavedName] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [addresses, setAddresses] = useState(user?.savedAddresses || []);
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState(EMPTY_ADDR);
  const [addrErr, setAddrErr] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSavedName(false);
    setProfileError('');
    try {
      const u = await updateProfile({ name: name.trim(), phone: phone.trim() });
      // Merge — updateProfile returns a slim user; keep savedAddresses etc.
      applyUser({ ...user, name: u.name, phone: u.phone });
      setSavedName(true);
      setTimeout(() => setSavedName(false), 2000);
    } catch (err) {
      setProfileError(err?.message || 'Couldn’t save your changes. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    setAddrErr('');
    if (!addr.address.trim() || !addr.city.trim() || !addr.state || !/^\d{6}$/.test(addr.pincode.trim())) {
      setAddrErr('Please fill address, city, state and a valid 6-digit pincode.');
      return;
    }
    setSavingAddr(true);
    try {
      const list = await saveAddress(addr);
      setAddresses(list);
      applyUser({ ...user, savedAddresses: list });
      setAddr(EMPTY_ADDR);
      setShowAddr(false);
    } catch (err) {
      setAddrErr(err?.message || 'Could not save address.');
    } finally {
      setSavingAddr(false);
    }
  };

  const removeAddress = async (id) => {
    try {
      const list = await deleteAddress(id);
      setAddresses(list);
      applyUser({ ...user, savedAddresses: list });
    } catch {
      /* non-fatal */
    }
  };

  const setA = (k, v) => setAddr((a) => ({ ...a, [k]: v }));

  // Auth gate — after all hooks (so hook order stays stable across auth changes).
  if (!isAuthed) return <Navigate to="/login?redirect=/account" replace />;

  return (
    <div className="container section">
      <Helmet>
        <title>My account — MotoPark</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className={styles.head}>
        <div>
          <h1 className={styles.title}>Hi, {user?.name || 'rider'}</h1>
          <p className={styles.email}>{user?.email}</p>
        </div>
        <Button variant="outline" onClick={logout}>
          <LogOut size={16} strokeWidth={1.8} aria-hidden="true" /> Sign out
        </Button>
      </div>

      <div className={styles.grid}>
        {/* Profile */}
        <section className={styles.card}>
          <h2 className={styles.cardTitle}>Profile</h2>
          <form onSubmit={saveProfile} className={styles.form}>
            <Field label="Name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            <Field label="Email" value={user?.email || ''} disabled hint="Your sign-in email can't be changed here." />
            <Field label="Phone" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} inputMode="numeric" autoComplete="tel" />
            {/* role="alert" so a submit failure is announced. Field owns this for
                per-control errors; these two form-level ones are hand-rolled and
                were silent to screen readers until verified in a browser. */}
            {profileError && <p className={styles.err} role="alert">{profileError}</p>}
            <Button type="submit" variant="primary" disabled={savingProfile}>
              {savedName ? (<><Check size={16} strokeWidth={2.4} aria-hidden="true" /> Saved</>) : savingProfile ? 'Saving…' : 'Save changes'}
            </Button>
          </form>
        </section>

        {/* Addresses */}
        <section className={styles.card}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Saved addresses</h2>
            {!showAddr && (
              <button type="button" className={styles.addBtn} onClick={() => setShowAddr(true)}>
                <Plus size={15} strokeWidth={2} aria-hidden="true" /> Add
              </button>
            )}
          </div>

          {addresses.length === 0 && !showAddr && (
            <p className={styles.muted}>No saved addresses yet.</p>
          )}

          <ul className={styles.addrList}>
            {addresses.map((a) => (
              <li key={a._id || `${a.address}-${a.pincode}`} className={styles.addrItem}>
                <div>
                  <p className={styles.addrName}>{a.name || user?.name}</p>
                  <p className={styles.addrText}>
                    {a.address}, {a.city}, {a.state} – {a.pincode}
                    {a.phone ? ` · ${a.phone}` : ''}
                  </p>
                </div>
                {a._id && (
                  <button type="button" className={styles.addrDel} onClick={() => removeAddress(a._id)} aria-label="Delete address">
                    <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>

          {showAddr && (
            <form onSubmit={addAddress} className={styles.addrForm}>
              {addrErr && <p className={styles.err} role="alert">{addrErr}</p>}
              {/* Labelled, not placeholder-only: a placeholder is not a label —
                  it disappears on input and is unreliably announced. Wording
                  matches checkout so the two address forms read the same. */}
              <div className={styles.row2}>
                <Field label="Full name" placeholder="Your name" value={addr.name} onChange={(e) => setA('name', e.target.value)} autoComplete="name" />
                <Field label="Phone number" placeholder="10-digit mobile" value={addr.phone} onChange={(e) => setA('phone', e.target.value.replace(/\D/g, ''))} maxLength={10} inputMode="numeric" autoComplete="tel" />
              </div>
              <Field label="Address" as="textarea" rows={2} placeholder="House no, street, area, landmark" value={addr.address} onChange={(e) => setA('address', e.target.value)} />
              <div className={styles.row2}>
                <Field label="City" placeholder="Visakhapatnam" value={addr.city} onChange={(e) => setA('city', e.target.value)} autoComplete="address-level2" />
                <Field label="Pincode" placeholder="530016" value={addr.pincode} onChange={(e) => setA('pincode', e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" autoComplete="postal-code" />
              </div>
              <Field label="State" as="select" value={addr.state} onChange={(e) => setA('state', e.target.value)}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Field>
              <div className={styles.addrActions}>
                <button type="button" className={styles.cancel} onClick={() => { setShowAddr(false); setAddrErr(''); setAddr(EMPTY_ADDR); }}>Cancel</button>
                <Button type="submit" variant="primary" size="sm" disabled={savingAddr}>{savingAddr ? 'Saving…' : 'Save address'}</Button>
              </div>
            </form>
          )}
        </section>

        {/* Orders */}
        <section className={`${styles.card} ${styles.ordersCard}`}>
          <div className={styles.cardHead}>
            <h2 className={styles.cardTitle}>Order history</h2>
            <Link to="/store" className={styles.shopLink}>Shop more</Link>
          </div>
          <OrderHistory />
        </section>
      </div>
    </div>
  );
}
