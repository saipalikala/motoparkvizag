import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Minus, Plus, Trash2, ShoppingBag, ShieldCheck, ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { useCart } from '@/contexts/CartContext.jsx';
import { formatINR } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import { STORE } from '@/config/store.js';
import styles from './CartPage.module.css';

/**
 * CartPage `/cart` — reviews/edits the guest cart (CartContext). Subtotal is an
 * INDICATIVE client sum of line prices; shipping/taxes/final total are computed
 * server-side at checkout (Commerce Law 4 — the frontend never owns money).
 * noindex (transactional page).
 */
export default function CartPage() {
  const { items, count, subtotalINR, updateQty, removeItem, clear, lineKey } = useCart();

  const threshold = STORE.freeShipThreshold;
  const remaining = Math.max(0, threshold - subtotalINR);
  const freeShip = subtotalINR >= threshold;
  const progress = Math.min(100, Math.round((subtotalINR / threshold) * 100));

  return (
    <div className="container section">
      <Helmet>
        <title>Your cart — MotoPark</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <h1 className={styles.title}>Your cart</h1>

      {count === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon} aria-hidden="true">
            <ShoppingBag size={28} strokeWidth={1.6} />
          </span>
          <p className={styles.emptyTitle}>Your cart is empty</p>
          <p className={styles.emptyText}>Genuine gear for every ride is a click away.</p>
          <Button as={Link} to="/store" variant="primary">
            Start shopping
          </Button>
        </div>
      ) : (
        <div className={styles.layout}>
          {/* ── Line items ── */}
          <div className={styles.items}>
            <div className={styles.itemsHead}>
              <p className={styles.count}>
                {count} item{count === 1 ? '' : 's'}
              </p>
              <button type="button" className={styles.clear} onClick={clear}>
                Clear cart
              </button>
            </div>

            <ul className={styles.list}>
              {items.map((it) => {
                const key = lineKey(it);
                return (
                  <li key={key} className={styles.line}>
                    <Link to={`/products/${it.id}`} className={styles.thumb}>
                      {it.image ? (
                        <img src={cloudinaryUrl(it.image, { w: 180 })} alt={it.name} width="88" height="110" loading="lazy" />
                      ) : (
                        <span className={styles.thumbFallback} aria-hidden="true">MP</span>
                      )}
                    </Link>

                    <div className={styles.lineMain}>
                      <div className={styles.lineTop}>
                        <div>
                          {it.brand && <span className={styles.lineBrand}>{it.brand}</span>}
                          <Link to={`/products/${it.id}`} className={styles.lineName}>
                            {it.name}
                          </Link>
                          <p className={styles.lineVariant}>
                            {[it.color, it.size].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={styles.remove}
                          onClick={() => removeItem(key)}
                          aria-label={`Remove ${it.name}`}
                        >
                          <Trash2 size={17} strokeWidth={1.8} aria-hidden="true" />
                        </button>
                      </div>

                      <div className={styles.lineBottom}>
                        <div className={styles.qty} aria-label="Quantity">
                          <button
                            type="button"
                            onClick={() => updateQty(key, it.qty - 1)}
                            aria-label="Decrease quantity"
                            disabled={it.qty <= 1}
                          >
                            <Minus size={15} strokeWidth={2} aria-hidden="true" />
                          </button>
                          <span aria-live="polite">{it.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(key, it.qty + 1)}
                            aria-label="Increase quantity"
                          >
                            <Plus size={15} strokeWidth={2} aria-hidden="true" />
                          </button>
                        </div>
                        <span className={`price ${styles.linePrice}`}>
                          {formatINR(it.priceINR * it.qty)}
                        </span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>

            <Link to="/store" className={styles.continue}>
              ← Continue shopping
            </Link>
          </div>

          {/* ── Summary ── */}
          <aside className={styles.summary}>
            <h2 className={styles.summaryTitle}>Order summary</h2>

            <div className={styles.freeShip}>
              {freeShip ? (
                <p className={styles.freeShipDone}>🎉 You&rsquo;ve unlocked free shipping!</p>
              ) : (
                <p className={styles.freeShipMsg}>
                  Add <strong>{formatINR(remaining)}</strong> more for free shipping.
                </p>
              )}
              <div className={styles.progress} aria-hidden="true">
                <span className={styles.progressBar} style={{ width: `${progress}%` }} />
              </div>
            </div>

            <dl className={styles.rows}>
              <div className={styles.row}>
                <dt>Subtotal</dt>
                <dd className="price">{formatINR(subtotalINR)}</dd>
              </div>
              <div className={styles.row}>
                <dt>Shipping</dt>
                <dd className={styles.muted}>
                  {freeShip ? 'Free' : 'Calculated at checkout'}
                </dd>
              </div>
            </dl>

            <p className={styles.disclaimer}>
              Taxes and final shipping are calculated at checkout.
            </p>

            <Button as={Link} to="/checkout" variant="primary" size="lg" className={styles.checkout}>
              Checkout
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </Button>

            <p className={styles.secure}>
              <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
              Secure checkout · Razorpay
            </p>
          </aside>
        </div>
      )}
    </div>
  );
}
