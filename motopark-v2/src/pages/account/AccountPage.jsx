import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import {
  User,
  ShoppingBag,
  Heart,
  MapPin,
  Lock,
  Settings,
  HelpCircle,
  LogOut,
  Camera,
  Plus,
  Trash2,
  Check,
  ArrowRight,
  ShieldCheck,
  Mail,
  Phone,
  Bike,
  Ruler,
} from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import Field from '@/components/ui/Field.jsx';
import ProductCard from '@/components/commerce/ProductCard.jsx';
import OrderHistory from '@/features/account/OrderHistory.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
import { useToast } from '@/contexts/ToastContext.jsx';
import { updateProfile, saveAddress, deleteAddress } from '@/services/account.js';
import { INDIAN_STATES } from '@/config/geo.js';
import styles from './AccountPage.module.css';

const EMPTY_ADDR = { name: '', phone: '', address: '', city: '', state: '', pincode: '' };

export default function AccountPage() {
  const { user, isAuthed, logout, applyUser } = useAuth();
  const { items: wishlistItems } = useWishlist();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState('garage'); // 'garage' | 'profile' | 'orders' | 'wishlist' | 'addresses' | 'security' | 'settings' | 'help'

  // Profile Form States
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [gender, setGender] = useState(user?.gender || 'Prefer not to say');
  const [dob, setDob] = useState(user?.dob || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [savedProfile, setSavedProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');

  // Address States
  const [addresses, setAddresses] = useState(user?.savedAddresses || []);
  const [showAddr, setShowAddr] = useState(false);
  const [addr, setAddr] = useState(EMPTY_ADDR);
  const [addrErr, setAddrErr] = useState('');
  const [savingAddr, setSavingAddr] = useState(false);

  // My Garage States
  const [bikes, setBikes] = useState([
    { id: 'b1', make: 'Royal Enfield', model: 'Himalayan 450', year: '2024', color: 'Kaza Brown', isPrimary: true },
  ]);
  const [showAddBike, setShowAddBike] = useState(false);
  const [newMake, setNewMake] = useState('');
  const [newModel, setNewModel] = useState('');
  const [newYear, setNewYear] = useState('');

  const [helmetSize, setHelmetSize] = useState(user?.gearSizes?.helmet || 'L (59-60cm)');
  const [jacketSize, setJacketSize] = useState(user?.gearSizes?.jacket || 'XL');
  const [gloveSize, setGloveSize] = useState(user?.gearSizes?.glove || 'L');
  const [savedGearSizes, setSavedGearSizes] = useState(false);

  // Security Form
  const [currPass, setCurrPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [passSaved, setPassSaved] = useState(false);
  const [passErr, setPassErr] = useState('');

  // Settings Toggles
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [smsNotifs, setSmsNotifs] = useState(true);

  if (!isAuthed) return <Navigate to="/login?redirect=/account" replace />;

  const usernameHandle = user?.email ? `@${user.email.split('@')[0]}` : '@rider';

  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSavedProfile(false);
    setProfileError('');
    try {
      const u = await updateProfile({ name: name.trim(), phone: phone.trim() });
      applyUser({ ...user, name: u.name, phone: u.phone, gender, dob, avatarUrl });
      setSavedProfile(true);
      showToast('Profile updated successfully', 'success');
      setTimeout(() => setSavedProfile(false), 2000);
    } catch (err) {
      setProfileError(err?.message || 'Could not save your changes. Please try again.');
      showToast('Failed to update profile', 'error');
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
      showToast('Address saved successfully', 'success');
    } catch (err) {
      setAddrErr(err?.message || 'Could not save address.');
      showToast('Could not save address', 'error');
    } finally {
      setSavingAddr(false);
    }
  };

  const removeAddress = async (id) => {
    try {
      const list = await deleteAddress(id);
      setAddresses(list);
      applyUser({ ...user, savedAddresses: list });
      showToast('Address removed', 'info');
    } catch {
      showToast('Could not remove address', 'error');
    }
  };

  const handleAddBike = (e) => {
    e.preventDefault();
    if (!newMake || !newModel) {
      showToast('Please enter make and model', 'warning');
      return;
    }
    const b = {
      id: Date.now().toString(),
      make: newMake,
      model: newModel,
      year: newYear || '2024',
      isPrimary: bikes.length === 0,
    };
    setBikes([...bikes, b]);
    setNewMake('');
    setNewModel('');
    setNewYear('');
    setShowAddBike(false);
    showToast('Bike added to your garage', 'success');
  };

  const handleSaveGearSizes = (e) => {
    e.preventDefault();
    setSavedGearSizes(true);
    showToast('Riding gear sizes saved to profile', 'success');
    setTimeout(() => setSavedGearSizes(false), 2000);
  };

  const handlePasswordChange = (e) => {
    e.preventDefault();
    setPassErr('');
    if (!currPass || !newPass || !confPass) {
      setPassErr('Please fill in all password fields.');
      return;
    }
    if (newPass !== confPass) {
      setPassErr('New passwords do not match.');
      return;
    }
    if (newPass.length < 6) {
      setPassErr('Password must be at least 6 characters.');
      return;
    }
    setPassSaved(true);
    showToast('Password updated successfully', 'success');
    setCurrPass('');
    setNewPass('');
    setConfPass('');
    setTimeout(() => setPassSaved(false), 2000);
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setAvatarUrl(url);
      showToast('Avatar updated', 'success');
    }
  };

  const setA = (k, v) => setAddr((a) => ({ ...a, [k]: v }));

  const NAV_ITEMS = [
    { id: 'garage', label: 'My Garage', icon: Bike, isSpecial: true },
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'orders', label: 'My Orders', icon: ShoppingBag },
    { id: 'wishlist', label: 'Wishlist', icon: Heart, badge: wishlistItems?.length || 0 },
    { id: 'addresses', label: 'Address', icon: MapPin, badge: addresses?.length || 0 },
    { id: 'security', label: 'Change Password', icon: Lock },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'help', label: 'Help & Support', icon: HelpCircle },
  ];

  // Render tab content reusable helper
  const renderTabContent = () => (
    <>
      {/* 1. MY GARAGE TAB */}
      {activeTab === 'garage' && (
        <div className={styles.tabSection}>
          <header className={styles.sectionHeaderFlex}>
            <div>
              <span className={styles.sectionEyebrow}>SIGNATURE RIDER SPACE</span>
              <h1 className={styles.sectionTitle}>My Garage</h1>
              <p className={styles.sectionDesc}>Save your motorcycles and riding gear specifications.</p>
            </div>
            <Button variant="primary" size="sm" onClick={() => setShowAddBike(true)}>
              <Plus size={16} strokeWidth={2} aria-hidden="true" /> Add Motorcycle
            </Button>
          </header>

          {/* Motorcycles List */}
          <div className={styles.garageSection}>
            <h3 className={styles.subHeading}>
              <Bike size={20} strokeWidth={2} className={styles.subHeadingIcon} /> Saved Motorcycles
            </h3>

            <div className={styles.bikesGrid}>
              {bikes.map((b) => (
                <div key={b.id} className={styles.bikeCard}>
                  <div className={styles.bikeBadgeRow}>
                    <span className={styles.bikeMake}>{b.make}</span>
                    {b.isPrimary && <span className={styles.primaryBadge}>Primary Machine</span>}
                  </div>
                  <h4 className={styles.bikeModel}>{b.model}</h4>
                  <p className={styles.bikeYear}>Year: {b.year} {b.color ? `· ${b.color}` : ''}</p>
                  <div className={styles.bikeCardFooter}>
                    <Link to={`/bikes?search=${encodeURIComponent(b.model)}`} className={styles.fitmentLink}>
                      Find Compatible Gear <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            {showAddBike && (
              <form onSubmit={handleAddBike} className={styles.garageCardForm}>
                <h4 className={styles.formTitle}>Add Motorcycle to Garage</h4>
                <div className={styles.inputGrid3}>
                  <Field label="Make / Brand" placeholder="e.g. Royal Enfield, KTM" value={newMake} onChange={(e) => setNewMake(e.target.value)} />
                  <Field label="Model" placeholder="e.g. Himalayan 450, Duke 390" value={newModel} onChange={(e) => setNewModel(e.target.value)} />
                  <Field label="Model Year" placeholder="e.g. 2024" value={newYear} onChange={(e) => setNewYear(e.target.value)} />
                </div>
                <div className={styles.formActions}>
                  <button type="button" className={styles.cancelBtn} onClick={() => setShowAddBike(false)}>Cancel</button>
                  <Button type="submit" variant="primary" size="sm">Save to Garage</Button>
                </div>
              </form>
            )}
          </div>

          {/* Saved Riding Gear Sizes */}
          <div className={styles.garageSection}>
            <h3 className={styles.subHeading}>
              <Ruler size={20} strokeWidth={2} className={styles.subHeadingIcon} /> Riding Gear Fitment Profile
            </h3>
            <p className={styles.sectionDesc}>Save your body measurements for instant size recommendations on helmets, jackets, and gloves.</p>

            <form onSubmit={handleSaveGearSizes} className={styles.profileCard}>
              <div className={styles.inputGrid3}>
                <Field label="Helmet Size" as="select" value={helmetSize} onChange={(e) => setHelmetSize(e.target.value)}>
                  <option value="S (55-56cm)">S (55-56cm)</option>
                  <option value="M (57-58cm)">M (57-58cm)</option>
                  <option value="L (59-60cm)">L (59-60cm)</option>
                  <option value="XL (61-62cm)">XL (61-62cm)</option>
                  <option value="2XL (63-64cm)">2XL (63-64cm)</option>
                </Field>

                <Field label="Jacket Size" as="select" value={jacketSize} onChange={(e) => setJacketSize(e.target.value)}>
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="XL">Extra Large (XL)</option>
                  <option value="2XL">Double Extra Large (2XL)</option>
                </Field>

                <Field label="Glove Size" as="select" value={gloveSize} onChange={(e) => setGloveSize(e.target.value)}>
                  <option value="S">Small (S)</option>
                  <option value="M">Medium (M)</option>
                  <option value="L">Large (L)</option>
                  <option value="XL">Extra Large (XL)</option>
                </Field>
              </div>

              <div className={styles.formFooter}>
                <Button type="submit" variant="primary" disabled={savedGearSizes}>
                  {savedGearSizes ? <><Check size={16} /> Sizes Saved</> : 'Save Fitment Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. PROFILE TAB */}
      {activeTab === 'profile' && (
        <div className={styles.tabSection}>
          <header className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>Profile Details</h1>
            <p className={styles.sectionDesc}>Manage your personal rider information and contact preferences.</p>
          </header>

          <form onSubmit={saveProfile} className={styles.profileCard}>
            <div className={styles.inputGrid2}>
              <Field label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" placeholder="Parves Ahamad" />
              <Field label="User name" value={usernameHandle} disabled hint="Generated automatically from your account email." />
            </div>

            <div className={styles.inputGrid2}>
              <Field label="Email" value={user?.email || ''} disabled hint="Your sign-in email address cannot be changed." />
              <Field label="Phone number" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} maxLength={10} inputMode="numeric" autoComplete="tel" placeholder="10-digit mobile number" />
            </div>

            <div className={styles.inputGrid2}>
              <Field label="Gender" as="select" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </Field>
              <Field label="Birthday" type="date" value={dob} onChange={(e) => setDob(e.target.value)} />
            </div>

            {profileError && <p className={styles.err} role="alert">{profileError}</p>}

            <div className={styles.formFooter}>
              <Button type="submit" variant="primary" disabled={savingProfile}>
                {savedProfile ? <><Check size={16} strokeWidth={2.4} aria-hidden="true" /> Saved</> : savingProfile ? 'Saving…' : 'Save changes'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 3. ORDERS TAB */}
      {activeTab === 'orders' && (
        <div className={styles.tabSection}>
          <header className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>My Orders</h1>
            <p className={styles.sectionDesc}>Track your order status and view complete purchase history.</p>
          </header>
          <div className={styles.ordersCard}>
            <OrderHistory />
          </div>
        </div>
      )}

      {/* 4. WISHLIST TAB */}
      {activeTab === 'wishlist' && (
        <div className={styles.tabSection}>
          <header className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>Wishlist</h1>
            <p className={styles.sectionDesc}>Your saved gear and bike accessories.</p>
          </header>

          {wishlistItems && wishlistItems.length > 0 ? (
            <div className={styles.wishlistGrid}>
              {wishlistItems.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          ) : (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrap}>
                <Heart size={32} strokeWidth={1.6} />
              </div>
              <h3 className={styles.emptyTitle}>Your wishlist is empty</h3>
              <p className={styles.emptyText}>Explore our catalog and save items you want to gear up with.</p>
              <Button as={Link} to="/store" variant="primary">Explore Store</Button>
            </div>
          )}
        </div>
      )}

      {/* 5. ADDRESSES TAB */}
      {activeTab === 'addresses' && (
        <div className={styles.tabSection}>
          <div className={styles.sectionHeaderFlex}>
            <div>
              <h1 className={styles.sectionTitle}>Saved Addresses</h1>
              <p className={styles.sectionDesc}>Manage delivery locations for faster checkout.</p>
            </div>
            {!showAddr && (
              <Button variant="primary" size="sm" onClick={() => setShowAddr(true)}>
                <Plus size={16} strokeWidth={2} aria-hidden="true" /> Add Address
              </Button>
            )}
          </div>

          {addresses.length === 0 && !showAddr && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconWrap}>
                <MapPin size={32} strokeWidth={1.6} />
              </div>
              <h3 className={styles.emptyTitle}>No saved addresses</h3>
              <p className={styles.emptyText}>Add your delivery address for instant checkout.</p>
              <Button variant="primary" onClick={() => setShowAddr(true)}>Add New Address</Button>
            </div>
          )}

          <div className={styles.addressGrid}>
            {addresses.map((a, idx) => (
              <div key={a._id || `${a.address}-${a.pincode}`} className={styles.addressCard}>
                <div className={styles.addressMeta}>
                  <div className={styles.addrHeaderRow}>
                    <h4 className={styles.addrName}>{a.name || user?.name}</h4>
                    {idx === 0 && <span className={styles.defaultBadge}>Default Address</span>}
                  </div>
                  <p className={styles.addrBody}>{a.address}</p>
                  <p className={styles.addrCity}>{a.city}, {a.state} – {a.pincode}</p>
                  {a.phone && <p className={styles.addrPhone}>Phone: {a.phone}</p>}
                </div>
                {a._id && (
                  <button type="button" className={styles.addrDelBtn} onClick={() => removeAddress(a._id)} aria-label="Delete address">
                    <Trash2 size={16} strokeWidth={1.8} aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {showAddr && (
            <form onSubmit={addAddress} className={styles.addressFormCard}>
              <h3 className={styles.formTitle}>Add New Address</h3>
              {addrErr && <p className={styles.err} role="alert">{addrErr}</p>}

              <div className={styles.inputGrid2}>
                <Field label="Full name" placeholder="Recipient's name" value={addr.name} onChange={(e) => setA('name', e.target.value)} autoComplete="name" />
                <Field label="Phone number" placeholder="10-digit mobile" value={addr.phone} onChange={(e) => setA('phone', e.target.value.replace(/\D/g, ''))} maxLength={10} inputMode="numeric" autoComplete="tel" />
              </div>

              <Field label="Address" as="textarea" rows={2} placeholder="House/Flat no, building, street, landmark" value={addr.address} onChange={(e) => setA('address', e.target.value)} />

              <div className={styles.inputGrid2}>
                <Field label="City" placeholder="Visakhapatnam" value={addr.city} onChange={(e) => setA('city', e.target.value)} autoComplete="address-level2" />
                <Field label="Pincode" placeholder="530016" value={addr.pincode} onChange={(e) => setA('pincode', e.target.value.replace(/\D/g, ''))} maxLength={6} inputMode="numeric" autoComplete="postal-code" />
              </div>

              <Field label="State" as="select" value={addr.state} onChange={(e) => setA('state', e.target.value)}>
                <option value="">Select state</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Field>

              <div className={styles.formActions}>
                <button type="button" className={styles.cancelBtn} onClick={() => { setShowAddr(false); setAddrErr(''); setAddr(EMPTY_ADDR); }}>Cancel</button>
                <Button type="submit" variant="primary" size="md" disabled={savingAddr}>{savingAddr ? 'Saving…' : 'Save Address'}</Button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* 6. SECURITY TAB */}
      {activeTab === 'security' && (
        <div className={styles.tabSection}>
          <header className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>Security & Password</h1>
            <p className={styles.sectionDesc}>Update your password and secure your MotoPark account.</p>
          </header>

          <form onSubmit={handlePasswordChange} className={styles.profileCard}>
            <Field label="Current Password" type="password" value={currPass} onChange={(e) => setCurrPass(e.target.value)} placeholder="Enter current password" />
            <Field label="New Password" type="password" value={newPass} onChange={(e) => setNewPass(e.target.value)} placeholder="Enter new password" />
            <Field label="Confirm New Password" type="password" value={confPass} onChange={(e) => setConfPass(e.target.value)} placeholder="Confirm new password" />

            {passErr && <p className={styles.err} role="alert">{passErr}</p>}

            <div className={styles.formFooter}>
              <Button type="submit" variant="primary">
                {passSaved ? <><Check size={16} strokeWidth={2.4} aria-hidden="true" /> Password Updated</> : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 7. SETTINGS TAB */}
      {activeTab === 'settings' && (
        <div className={styles.tabSection}>
          <header className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>Account Settings</h1>
            <p className={styles.sectionDesc}>Configure notification preferences and updates.</p>
          </header>

          <div className={styles.profileCard}>
            <div className={styles.toggleRow}>
              <div>
                <h4 className={styles.toggleTitle}>Email Notifications</h4>
                <p className={styles.toggleDesc}>Receive order updates, dispatch alerts, and digital receipts.</p>
              </div>
              <input type="checkbox" checked={emailNotifs} onChange={(e) => setEmailNotifs(e.target.checked)} className={styles.toggleCheck} />
            </div>

            <div className={styles.toggleRow}>
              <div>
                <h4 className={styles.toggleTitle}>SMS & WhatsApp Dispatch Alerts</h4>
                <p className={styles.toggleDesc}>Receive real-time courier tracking updates directly on your phone.</p>
              </div>
              <input type="checkbox" checked={smsNotifs} onChange={(e) => setSmsNotifs(e.target.checked)} className={styles.toggleCheck} />
            </div>
          </div>
        </div>
      )}

      {/* 8. HELP & SUPPORT TAB */}
      {activeTab === 'help' && (
        <div className={styles.tabSection}>
          <header className={styles.sectionHeader}>
            <h1 className={styles.sectionTitle}>Help & Support</h1>
            <p className={styles.sectionDesc}>We are here to assist you with order queries, returns, and fitment guidance.</p>
          </header>

          <div className={styles.helpGrid}>
            <div className={styles.helpCard}>
              <Phone size={24} strokeWidth={1.8} className={styles.helpIcon} />
              <h3 className={styles.helpCardTitle}>Customer Care Phone</h3>
              <p className={styles.helpCardText}>Mon–Sat, 10:00 AM – 7:30 PM IST</p>
              <a href="tel:+919876543210" className={styles.helpLink}>+91 98765 43210</a>
            </div>

            <div className={styles.helpCard}>
              <Mail size={24} strokeWidth={1.8} className={styles.helpIcon} />
              <h3 className={styles.helpCardTitle}>Email Support</h3>
              <p className={styles.helpCardText}>Guaranteed response within 24 hours</p>
              <a href="mailto:support@motoparkvizag.com" className={styles.helpLink}>support@motoparkvizag.com</a>
            </div>

            <div className={styles.helpCard}>
              <ShieldCheck size={24} strokeWidth={1.8} className={styles.helpIcon} />
              <h3 className={styles.helpCardTitle}>Warranty & Returns</h3>
              <p className={styles.helpCardText}>100% Genuine product guarantee</p>
              <Link to="/static/returns" className={styles.helpLink}>View Policy</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );

  return (
    <div className={`section ${styles.accountWrapper}`}>
      <Helmet>
        <title>Rider Dashboard — MotoPark</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className="container">
        {/* ── 1. DESKTOP VIEW (MIN-WIDTH: 861px) ────────────────── */}
        <div className={styles.desktopView}>
          <aside className={styles.sidebar}>
            <div className={styles.sidebarHeader}>
              <div className={styles.avatarWrap}>
                {avatarUrl ? (
                  <img src={avatarUrl} alt={user?.name || 'Rider'} className={styles.avatarImg} />
                ) : (
                  <div className={styles.avatarFallback}>
                    {(user?.name || 'Rider').charAt(0).toUpperCase()}
                  </div>
                )}
                <label className={styles.cameraBtn} title="Change photo">
                  <Camera size={14} strokeWidth={2.2} />
                  <input type="file" accept="image/*" className={styles.fileInput} onChange={handleAvatarChange} />
                </label>
              </div>

              <h2 className={styles.userName}>{user?.name || 'Rider'}</h2>
              <p className={styles.userHandle}>{usernameHandle}</p>

              <button
                type="button"
                className={styles.editProfileBtn}
                onClick={() => setActiveTab('profile')}
              >
                Edit Profile
              </button>
            </div>

            <nav className={styles.navMenu} aria-label="Rider Navigation Desktop">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`${styles.navItem} ${isActive ? styles.navItemActive : ''} ${item.isSpecial ? styles.navItemSpecial : ''}`}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <Icon size={18} strokeWidth={1.8} className={styles.navIcon} />
                    <span className={styles.navLabel}>{item.label}</span>
                    {item.isSpecial && <span className={styles.specialPill}>Rider Hub</span>}
                    {item.badge > 0 && <span className={styles.navBadge}>{item.badge}</span>}
                    <ArrowRight size={14} strokeWidth={2} className={styles.navChevron} />
                  </button>
                );
              })}

              <button type="button" className={`${styles.navItem} ${styles.navLogout}`} onClick={logout}>
                <LogOut size={18} strokeWidth={1.8} className={styles.navIcon} />
                <span className={styles.navLabel}>Log out</span>
              </button>
            </nav>
          </aside>

          <main className={styles.contentArea}>
            {renderTabContent()}
          </main>
        </div>

        {/* ── 2. DEDICATED MOBILE VIEW (< 860px) ────────────────── */}
        <div className={styles.mobileView}>
          {/* Mobile Profile Header */}
          <div className={styles.mobileHeaderCard}>
            <div className={styles.mobileAvatarWrap}>
              {avatarUrl ? (
                <img src={avatarUrl} alt={user?.name || 'Rider'} className={styles.avatarImg} />
              ) : (
                <div className={styles.avatarFallback}>
                  {(user?.name || 'Rider').charAt(0).toUpperCase()}
                </div>
              )}
              <label className={styles.cameraBtn} title="Change photo">
                <Camera size={12} strokeWidth={2.2} />
                <input type="file" accept="image/*" className={styles.fileInput} onChange={handleAvatarChange} />
              </label>
            </div>

            <h2 className={styles.mobileUserName}>{user?.name || 'Rider'}</h2>
            <p className={styles.mobileUserHandle}>{usernameHandle}</p>

            <button
              type="button"
              className={styles.mobileEditBtn}
              onClick={() => setActiveTab('profile')}
            >
              Edit Profile
            </button>
          </div>

          {/* Mobile Navigation List Grid */}
          <nav className={styles.mobileNavGrid} aria-label="Rider Navigation Mobile">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`${styles.mobileNavItem} ${isActive ? styles.mobileNavItemActive : ''}`}
                  onClick={() => setActiveTab(item.id)}
                >
                  <Icon size={18} strokeWidth={2} className={styles.mobileNavIcon} />
                  <span className={styles.mobileNavLabel}>{item.label}</span>
                  {item.badge > 0 && <span className={styles.mobileNavBadge}>{item.badge}</span>}
                </button>
              );
            })}
            <button type="button" className={`${styles.mobileNavItem} ${styles.mobileNavLogout}`} onClick={logout}>
              <LogOut size={18} strokeWidth={2} className={styles.mobileNavIcon} />
              <span className={styles.mobileNavLabel}>Log out</span>
            </button>
          </nav>

          {/* Mobile Section Content */}
          <main className={styles.mobileContentArea}>
            {renderTabContent()}
          </main>
        </div>
      </div>
    </div>
  );
}
