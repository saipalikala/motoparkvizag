import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, Lock, Truck, ShoppingBag, ChevronRight } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { useCart } from '@/contexts/CartContext.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import { formatINR } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import { STORE } from '@/config/store.js';
import { loadRazorpay, RAZORPAY_KEY_ID } from '@/lib/razorpay.js';
import { createRazorpayOrder, verifyPayment } from '@/services/checkout.js';
import { createOrder } from '@/services/orders.js';
import { INDIAN_STATES } from '@/config/geo.js';
import styles from './CheckoutPage.module.css';

const STEPS = ['Delivery', 'Payment', 'Review'];

export default function CheckoutPage() {
  const { items, count, subtotalINR, clearCart } = useCart();
  const { user, isAuthed } = useAuth();
  const navigate = useNavigate();

  const savedAddresses = user?.savedAddresses || [];

  const [step, setStep] = useState(1);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState('');
  const [placed, setPlaced] = useState(null); // { id, paymentId }
  const [errors, setErrors] = useState({});
  // Prefill from the rider's first saved address (falls back to profile fields).
  const [form, setForm] = useState(() => {
    const a = savedAddresses[0];
    return {
      name: a?.name || user?.name || '',
      phone: a?.phone || user?.phone || '',
      email: user?.email || '',
      address: a?.address || '',
      city: a?.city || '',
      state: a?.state || '',
      pincode: a?.pincode || '',
    };
  });

  const fillFromSaved = (a) => {
    setForm((f) => ({
      ...f,
      name: a.name || f.name,
      phone: a.phone || f.phone,
      address: a.address || '',
      city: a.city || '',
      state: a.state || '',
      pincode: a.pincode || '',
    }));
    setErrors({});
  };

  const delivery = subtotalINR >= STORE.freeShipThreshold ? 0 : STORE.shippingFlat;
  const total = subtotalINR + delivery;

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    if (errors[k]) setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };

  const validateAddress = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Required';
    if (!/^\d{10}$/.test(form.phone.trim())) e.phone = 'Enter a valid 10-digit number';
    if (!form.address.trim()) e.address = 'Required';
    if (!form.city.trim()) e.city = 'Required';
    if (!form.state) e.state = 'Select a state';
    if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = 'Enter a valid 6-digit pincode';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const next = () => {
    if (step === 1 && !validateAddress()) return;
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePay = async () => {
    setError('');
    if (!RAZORPAY_KEY_ID) {
      setError('Online payment isn’t configured yet (missing Razorpay key). Please try again later.');
      return;
    }
    setPaying(true);
    try {
      const ok = await loadRazorpay();
      if (!ok) throw new Error('Couldn’t load the payment gateway — check your connection and retry.');

      const rp = await createRazorpayOrder({
        items: items.map((i) => ({ productId: i.id, quantity: i.qty })),
      });

      const options = {
        key: RAZORPAY_KEY_ID,
        amount: rp.amount,
        currency: rp.currency,
        name: 'MotoPark',
        description: 'Order payment',
        order_id: rp.orderId,
        prefill: { name: form.name, email: form.email, contact: form.phone },
        theme: { color: '#e8532e' },
        modal: { ondismiss: () => setPaying(false) },
        handler: async (response) => {
          try {
            const v = await verifyPayment(response);
            if (!v.success) throw new Error('Payment verification failed. Please contact support.');
            const order = await createOrder({
              items: items.map((i) => ({
                product: i.id,
                quantity: i.qty,
                selectedColor: i.color,
                selectedSize: i.size,
              })),
              shippingAddress: form,
              payment: response,
            });
            clearCart();
            setPlaced({ id: order._id, paymentId: response.razorpay_payment_id });
          } catch (err) {
            if (err?.code === 409) {
              clearCart();
              setPlaced({ id: err.raw?.response?.data?.orderId, paymentId: response.razorpay_payment_id });
              return;
            }
            setError(
              `Payment succeeded but saving your order failed. Please contact support with payment id ${response.razorpay_payment_id}.`,
            );
          } finally {
            setPaying(false);
          }
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (err) {
      setError(err?.message || 'Couldn’t start payment. Please try again.');
      setPaying(false);
    }
  };

  /* ── Confirmation ── */
  if (placed) {
    return (
      <div className={`container section ${styles.confirmWrap}`}>
        <Helmet><title>Order confirmed — MotoPark</title><meta name="robots" content="noindex" /></Helmet>
        <span className={styles.confirmIcon} aria-hidden="true"><Check size={30} strokeWidth={2.5} /></span>
        <h1 className={styles.confirmTitle}>Order placed!</h1>
        <p className={styles.confirmText}>
          Thank you{form.name ? `, ${form.name}` : ''}. Your payment was successful and your order is
          confirmed{form.city ? ` for delivery to ${form.city}` : ''}. We’ll email you the details.
        </p>
        {placed.id && <p className={styles.confirmMeta}>Order ID: <strong>{placed.id}</strong></p>}
        <p className={styles.confirmMeta}>Payment ID: {placed.paymentId}</p>
        <div className={styles.confirmActions}>
          <Button as={Link} to="/track" variant="primary">Track your order</Button>
          <Button as={Link} to="/store" variant="outline">Continue shopping</Button>
        </div>
      </div>
    );
  }

  /* ── Empty cart ── */
  if (count === 0) {
    return (
      <div className={`container section ${styles.confirmWrap}`}>
        <Helmet><title>Checkout — MotoPark</title><meta name="robots" content="noindex" /></Helmet>
        <span className={styles.confirmIcon} aria-hidden="true"><ShoppingBag size={28} strokeWidth={1.6} /></span>
        <h1 className={styles.confirmTitle}>Your cart is empty</h1>
        <p className={styles.confirmText}>Add some gear before checking out.</p>
        <Button as={Link} to="/store" variant="primary">Shop all gear</Button>
      </div>
    );
  }

  return (
    <div className="container section">
      <Helmet><title>Checkout — MotoPark</title><meta name="robots" content="noindex" /></Helmet>

      <header className={styles.head}>
        <h1 className={styles.title}>Checkout</h1>
        <p className={styles.sub}>
          {count} item{count === 1 ? '' : 's'} · {formatINR(subtotalINR)}
        </p>
      </header>

      {!isAuthed && (
        <p className={styles.guestNote}>
          Checking out as a guest.{' '}
          <Link to="/login?redirect=/checkout">Sign in</Link> to save your details and track orders.
        </p>
      )}

      {/* Stepper */}
      <ol className={styles.steps}>
        {STEPS.map((label, i) => {
          const n = i + 1;
          return (
            <li key={label} className={`${styles.step} ${step === n ? styles.stepActive : ''} ${step > n ? styles.stepDone : ''}`}>
              <span className={styles.stepNum}>{step > n ? <Check size={14} strokeWidth={3} aria-hidden="true" /> : n}</span>
              {label}
            </li>
          );
        })}
      </ol>

      <div className={styles.layout}>
        <div className={styles.main}>
          {error && <p className={styles.error} role="alert">{error}</p>}

          {/* STEP 1 — ADDRESS */}
          {step === 1 && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Delivery address</h2>
              {savedAddresses.length > 0 && (
                <div className={styles.saved}>
                  <p className={styles.savedLabel}>Use a saved address</p>
                  <div className={styles.savedChips}>
                    {savedAddresses.map((a, i) => (
                      <button type="button" key={a._id || i} className={styles.savedChip} onClick={() => fillFromSaved(a)}>
                        <span className={styles.savedChipName}>{a.name || 'Saved address'}</span>
                        <span className={styles.savedChipText}>{[a.city, a.pincode].filter(Boolean).join(', ')}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className={styles.grid2}>
                <Field label="Full name" error={errors.name}>
                  <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Your name" autoComplete="name" />
                </Field>
                <Field label="Phone number" error={errors.phone}>
                  <input value={form.phone} onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))} placeholder="10-digit mobile" maxLength={10} inputMode="numeric" autoComplete="tel" />
                </Field>
              </div>
              <Field label="Email (optional)">
                <input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="for order updates" autoComplete="email" />
              </Field>
              <Field label="Address" error={errors.address}>
                <textarea rows={3} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="House no, street, area, landmark" />
              </Field>
              <div className={styles.grid2}>
                <Field label="City" error={errors.city}>
                  <input value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Visakhapatnam" autoComplete="address-level2" />
                </Field>
                <Field label="Pincode" error={errors.pincode}>
                  <input value={form.pincode} onChange={(e) => set('pincode', e.target.value.replace(/\D/g, ''))} placeholder="530016" maxLength={6} inputMode="numeric" autoComplete="postal-code" />
                </Field>
              </div>
              <Field label="State" error={errors.state}>
                <select value={form.state} onChange={(e) => set('state', e.target.value)}>
                  <option value="">Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Button variant="primary" size="lg" onClick={next} className={styles.cta}>
                Continue to payment <ChevronRight size={18} strokeWidth={2} aria-hidden="true" />
              </Button>
            </section>
          )}

          {/* STEP 2 — PAYMENT */}
          {step === 2 && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Payment method</h2>
              <div className={`${styles.payOption} ${styles.payActive}`}>
                <div>
                  <p className={styles.payLabel}>Pay online</p>
                  <p className={styles.paySub}>UPI · Cards · Net Banking · Wallets</p>
                </div>
                <span className={styles.payRadio} aria-hidden="true"><Check size={13} strokeWidth={3} /></span>
              </div>
              <div className={`${styles.payOption} ${styles.payDisabled}`}>
                <div>
                  <p className={styles.payLabel}>Cash on Delivery <span className={styles.codTag}>Not available</span></p>
                  <p className={styles.paySub}>COD isn’t available for online orders right now.</p>
                </div>
                <span className={styles.payRadioEmpty} aria-hidden="true" />
              </div>
              <p className={styles.secureHint}><Lock size={14} strokeWidth={1.8} aria-hidden="true" /> Secured by Razorpay — your payment details never touch our servers.</p>
              <div className={styles.stepNav}>
                <button type="button" className={styles.backBtn} onClick={() => setStep(1)}>← Back</button>
                <Button variant="primary" size="lg" onClick={next}>Review order <ChevronRight size={18} strokeWidth={2} aria-hidden="true" /></Button>
              </div>
            </section>
          )}

          {/* STEP 3 — REVIEW */}
          {step === 3 && (
            <section className={styles.panel}>
              <h2 className={styles.panelTitle}>Review your order</h2>
              <div className={styles.reviewBlock}>
                <div className={styles.reviewHead}>
                  <span>Delivering to</span>
                  <button type="button" className={styles.editBtn} onClick={() => setStep(1)}>Edit</button>
                </div>
                <p className={styles.reviewValue}>
                  <strong>{form.name}</strong> · {form.phone}<br />
                  {form.address}, {form.city}, {form.state} – {form.pincode}
                </p>
              </div>
              <div className={styles.reviewBlock}>
                <div className={styles.reviewHead}>
                  <span>Payment</span>
                  <button type="button" className={styles.editBtn} onClick={() => setStep(2)}>Edit</button>
                </div>
                <p className={styles.reviewValue}>Pay online via Razorpay</p>
              </div>
              <div className={styles.stepNav}>
                <button type="button" className={styles.backBtn} onClick={() => setStep(2)}>← Back</button>
                <Button variant="primary" size="lg" onClick={handlePay} disabled={paying}>
                  {paying ? 'Opening payment…' : `Pay ${formatINR(total)}`}
                </Button>
              </div>
            </section>
          )}
        </div>

        {/* ── Summary ── */}
        <aside className={styles.summary}>
          <h2 className={styles.summaryTitle}>Order summary</h2>
          <ul className={styles.sumItems}>
            {items.map((it) => (
              <li key={`${it.id}|${it.color}|${it.size}`} className={styles.sumItem}>
                <div className={styles.sumThumb}>
                  {it.image ? <img src={cloudinaryUrl(it.image, { w: 96 })} alt="" width="44" height="55" loading="lazy" /> : <span aria-hidden="true">MP</span>}
                  <span className={styles.sumQty}>{it.qty}</span>
                </div>
                <div className={styles.sumInfo}>
                  <span className={styles.sumName}>{it.name}</span>
                  {(it.colorName || it.size) && <span className={styles.sumMeta}>{[it.colorName, it.size].filter(Boolean).join(' · ')}</span>}
                </div>
                <span className={`price ${styles.sumPrice}`}>{formatINR(it.priceINR * it.qty)}</span>
              </li>
            ))}
          </ul>
          <dl className={styles.sumRows}>
            <div><dt>Subtotal</dt><dd className="price">{formatINR(subtotalINR)}</dd></div>
            <div><dt>Delivery</dt><dd>{delivery === 0 ? <span className={styles.free}>Free</span> : formatINR(delivery)}</dd></div>
          </dl>
          <div className={styles.sumTotal}><span>Total</span><span className="price price--lg">{formatINR(total)}</span></div>
          <div className={styles.trust}>
            <span><Lock size={13} strokeWidth={1.8} aria-hidden="true" /> Secure checkout</span>
            <span><Truck size={13} strokeWidth={1.8} aria-hidden="true" /> Ships Pan-India</span>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Field({ label, error, children }) {
  return (
    <label className={styles.field}>
      <span className={styles.fieldLabel}>{label}</span>
      {children}
      {error && <span className={styles.fieldErr}>{error}</span>}
    </label>
  );
}
