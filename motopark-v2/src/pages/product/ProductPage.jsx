import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Check, ShieldCheck, Truck, RotateCcw, Minus, Plus, Heart } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { getProduct } from '@/services/products.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
import { formatINR, discountPercent } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import styles from './ProductPage.module.css';

const isHex = (v) => /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(v || '');

/**
 * ProductPage (PDP) `/products/:slug` — V1 has no slug so the param carries the
 * product id. Grounded entirely in the fetched product: variant images, real
 * per-size stock, and MRP-based sale pricing (Commerce Law 2). Add-to-cart writes
 * to the guest CartContext. Renders a not-found state for bad/missing ids.
 */
export default function ProductPage() {
  const { slug: id } = useParams();
  const { addItem } = useCart();
  const { has: wishHas, toggle: wishToggle } = useWishlist();

  const [product, setProduct] = useState(undefined); // undefined = loading, null = 404
  const [colorIdx, setColorIdx] = useState(0);
  const [imgIdx, setImgIdx] = useState(0);
  const [size, setSize] = useState('');
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    let alive = true;
    setProduct(undefined);
    setColorIdx(0);
    setImgIdx(0);
    setSize('');
    setQty(1);
    window.scrollTo(0, 0);
    getProduct(id)
      .then((p) => alive && setProduct(p))
      .catch(() => alive && setProduct(null));
    return () => {
      alive = false;
    };
  }, [id]);

  if (product === undefined) {
    return (
      <div className="container section" aria-busy="true">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <p style={{ color: 'var(--text-secondary)' }}>Loading product…</p>
      </div>
    );
  }

  if (product === null) {
    return (
      <div
        className="container section"
        style={{ textAlign: 'center', display: 'grid', gap: 'var(--space-4)', placeItems: 'center' }}
      >
        <Helmet>
          <title>Product not found — MotoPark</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1>Product not found</h1>
        <p style={{ color: 'var(--text-secondary)' }}>This product may have sold out or been removed.</p>
        <Button as={Link} to="/store" variant="primary">
          Shop all gear
        </Button>
      </div>
    );
  }

  const variant = product.variants[colorIdx] || product.variants[0] || { images: [], sizes: [], colorName: '' };
  const images = variant.images;
  const sizes = variant.sizes;
  const onlyStandard = sizes.length === 1 && /^standard$/i.test(sizes[0]?.size || '');
  const chosenSizeObj = onlyStandard ? sizes[0] : sizes.find((s) => s.size === size) || null;
  const needsSize = !onlyStandard && sizes.length > 0;
  const variantInStock = sizes.some((s) => s.stock > 0);
  const canAdd = onlyStandard ? sizes[0]?.stock > 0 : Boolean(chosenSizeObj && chosenSizeObj.stock > 0);
  const discount = product.mrpINR ? discountPercent(product.mrpINR, product.priceINR) : 0;

  const selectColor = (i) => {
    setColorIdx(i);
    setImgIdx(0);
    setSize('');
  };

  const handleAdd = () => {
    if (!canAdd) return;
    addItem({
      id: product.id,
      name: product.name,
      brand: product.brand,
      priceINR: product.priceINR,
      image: images[0] || null,
      // `color` is the variant's hex — it is what the order API matches
      // variants on (backend arrayFilters compare against variants.color).
      // `colorName` is the human label, for display only.
      color: variant.color,
      colorName: variant.colorName,
      size: onlyStandard ? sizes[0].size : size,
      qty,
    });
    setAdded(true);
    window.clearTimeout(handleAdd._t);
    handleAdd._t = window.setTimeout(() => setAdded(false), 2200);
  };

  const ldJson = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    brand: product.brand,
    image: images[0] || undefined,
    description: (product.description || '').slice(0, 300) || undefined,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'INR',
      price: product.priceINR,
      availability: variantInStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <div className="container section">
      <Helmet>
        <title>{`${product.name} — ${product.brand} | MotoPark`}</title>
        <meta
          name="description"
          content={
            (product.description || `Buy the ${product.name} by ${product.brand} at MotoPark.`).slice(0, 160)
          }
        />
        <link rel="canonical" href={`https://motoparkvizag.in/products/${product.id}`} />
        <script type="application/ld+json">{JSON.stringify(ldJson)}</script>
      </Helmet>

      {/* Breadcrumb */}
      <nav className={styles.crumb} aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/store">Store</Link>
        <span aria-hidden="true">/</span>
        <span className={styles.crumbCurrent}>{product.name}</span>
      </nav>

      <div className={styles.layout}>
        {/* ── Gallery ── */}
        <div className={styles.gallery}>
          <div className={styles.stage}>
            {images[imgIdx] ? (
              <img src={cloudinaryUrl(images[imgIdx], { w: 800 })} alt={product.name} width="640" height="800" className={styles.stageImg} />
            ) : (
              <span className={styles.stageFallback} aria-hidden="true">MP</span>
            )}
          </div>
          {images.length > 1 && (
            <div className={styles.thumbs} role="listbox" aria-label="Product images">
              {images.map((src, i) => (
                <button
                  key={src}
                  type="button"
                  className={`${styles.thumb} ${i === imgIdx ? styles.thumbActive : ''}`}
                  onClick={() => setImgIdx(i)}
                  aria-label={`Image ${i + 1}`}
                  aria-selected={i === imgIdx}
                >
                  <img src={cloudinaryUrl(src, { w: 120 })} alt="" width="72" height="90" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Info ── */}
        <div className={styles.info}>
          <p className={styles.brand}>{product.brand}</p>
          <h1 className={styles.name}>{product.name}</h1>

          <div className={styles.priceRow}>
            <span className={`price price--lg ${discount ? 'price--sale' : ''}`}>
              {formatINR(product.priceINR)}
            </span>
            {discount > 0 && (
              <>
                <span className="price price--mrp">{formatINR(product.mrpINR)}</span>
                <span className={styles.save}>{discount}% off</span>
              </>
            )}
          </div>
          <p className={styles.tax}>Inclusive of all taxes</p>

          {/* Colors */}
          {product.variants.length > 1 && (
            <div className={styles.selectBlock}>
              <p className={styles.selectLabel}>
                Colour: <strong>{variant.colorName}</strong>
              </p>
              <div className={styles.swatches}>
                {product.variants.map((v, i) => (
                  <button
                    key={`${v.colorName}-${i}`}
                    type="button"
                    className={`${styles.swatch} ${i === colorIdx ? styles.swatchActive : ''}`}
                    onClick={() => selectColor(i)}
                    aria-label={v.colorName}
                    aria-pressed={i === colorIdx}
                    title={v.colorName}
                  >
                    {isHex(v.color) ? (
                      <span className={styles.swatchDot} style={{ background: v.color }} />
                    ) : (
                      <span className={styles.swatchText}>{v.colorName}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes */}
          {needsSize && (
            <div className={styles.selectBlock}>
              <p className={styles.selectLabel}>Size</p>
              <div className={styles.sizes}>
                {sizes.map((s) => {
                  const oos = s.stock <= 0;
                  return (
                    <button
                      key={s.size}
                      type="button"
                      className={`${styles.size} ${size === s.size ? styles.sizeActive : ''} ${oos ? styles.sizeOos : ''}`}
                      onClick={() => !oos && setSize(s.size)}
                      disabled={oos}
                      aria-pressed={size === s.size}
                    >
                      {s.size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stock line */}
          <p className={styles.stock}>
            {canAdd ? (
              <span className={styles.inStock}>
                <Check size={15} strokeWidth={2.4} aria-hidden="true" /> In stock
                {chosenSizeObj && chosenSizeObj.stock <= 5 ? ` — only ${chosenSizeObj.stock} left` : ''}
              </span>
            ) : needsSize && !size ? (
              <span className={styles.pickSize}>Select a size to check availability</span>
            ) : (
              <span className={styles.oos}>Out of stock</span>
            )}
          </p>

          {/* Qty + Add */}
          <div className={styles.buyRow}>
            <div className={styles.qty} aria-label="Quantity">
              <button type="button" onClick={() => setQty((q) => Math.max(1, q - 1))} aria-label="Decrease quantity" disabled={qty <= 1}>
                <Minus size={16} strokeWidth={2} aria-hidden="true" />
              </button>
              <span aria-live="polite">{qty}</span>
              <button type="button" onClick={() => setQty((q) => q + 1)} aria-label="Increase quantity">
                <Plus size={16} strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <Button
              variant="primary"
              size="lg"
              className={styles.addBtn}
              onClick={handleAdd}
              disabled={!canAdd}
            >
              {added ? (
                <>
                  <Check size={18} strokeWidth={2.4} aria-hidden="true" /> Added to cart
                </>
              ) : canAdd ? (
                'Add to cart'
              ) : needsSize && !size ? (
                'Select a size'
              ) : (
                'Out of stock'
              )}
            </Button>

            <button
              type="button"
              className={`${styles.wish} ${wishHas(product.id) ? styles.wishOn : ''}`}
              aria-label={wishHas(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
              aria-pressed={wishHas(product.id)}
              onClick={() =>
                wishToggle({
                  id: product.id,
                  name: product.name,
                  brand: product.brand,
                  priceINR: product.priceINR,
                  image: images[0] || null,
                  url: product.url,
                })
              }
            >
              <Heart
                size={20}
                strokeWidth={1.8}
                fill={wishHas(product.id) ? 'currentColor' : 'none'}
                aria-hidden="true"
              />
            </button>
          </div>

          {/* Trust mini-row */}
          <ul className={styles.assurances}>
            <li><ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" /> Genuine product</li>
            <li><Truck size={16} strokeWidth={1.8} aria-hidden="true" /> Ships Pan-India</li>
            <li><RotateCcw size={16} strokeWidth={1.8} aria-hidden="true" /> Easy returns</li>
          </ul>

          {/* Details */}
          {product.description && (
            <section className={styles.detail}>
              <h2 className={styles.detailTitle}>Description</h2>
              <p className={styles.detailBody}>{product.description}</p>
            </section>
          )}
          {product.specs && (
            <section className={styles.detail}>
              <h2 className={styles.detailTitle}>Specifications</h2>
              <p className={styles.detailBody}>{product.specs}</p>
            </section>
          )}
          {product.care && (
            <section className={styles.detail}>
              <h2 className={styles.detailTitle}>Care</h2>
              <p className={styles.detailBody}>{product.care}</p>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
