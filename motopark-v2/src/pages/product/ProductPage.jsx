import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Button from '@/components/ui/Button.jsx';
import Reveal from '@/components/ui/Reveal.jsx';
import { getProduct } from '@/services/products.js';
import { useCart } from '@/contexts/CartContext.jsx';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
import { discountPercent } from '@/lib/format.js';
import ProductHero from './ProductHero.jsx';
import SimilarProducts from './SimilarProducts.jsx';
import styles from './ProductPage.module.css';

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
  const { showToast } = useToast();

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
  // Units available for the size actually selected — bounds the stepper below and
  // rides along on the cart line so /cart can cap without refetching the product.
  const availableStock = chosenSizeObj?.stock ?? 0;
  const discount = product.mrpINR ? discountPercent(product.mrpINR, product.priceINR) : 0;

  const selectColor = (i) => {
    setColorIdx(i);
    setImgIdx(0);
    setSize('');
    setQty(1); // stock is per colour+size; the old qty means nothing here
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
      stock: availableStock,
      qty,
    });
    setAdded(true);
    showToast(`Added ${product.name} to Cart`, 'success');
    window.clearTimeout(handleAdd._t);
    handleAdd._t = window.setTimeout(() => setAdded(false), 2000);
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

      {/* ── Product Hero Section (Editorial Showcase) ── */}
      <ProductHero
        product={product}
        colorIdx={colorIdx}
        selectColor={selectColor}
        imgIdx={imgIdx}
        setImgIdx={setImgIdx}
        size={size}
        setSize={setSize}
        qty={qty}
        setQty={setQty}
        canAdd={canAdd}
        needsSize={needsSize}
        variantInStock={variantInStock}
        chosenSizeObj={chosenSizeObj}
        availableStock={availableStock}
        discount={discount}
        variant={variant}
        images={images}
        sizes={sizes}
        handleAdd={handleAdd}
        added={added}
        wishHas={wishHas}
        wishToggle={wishToggle}
      />

      {/* ── Lower Details Sections (Unchanged) ── */}
      {(product.specs || product.care) && (
        <div className={styles.lowerDetails}>
          {product.specs && (
            <section className={styles.detail}>
              <h2 className={styles.detailTitle}>Specifications</h2>
              <p className={styles.detailBody}>{product.specs}</p>
            </section>
          )}
          {product.care && (
            <section className={styles.detail}>
              <h2 className={styles.detailTitle}>Care Instructions</h2>
              <p className={styles.detailBody}>{product.care}</p>
            </section>
          )}
        </div>
      )}
      <Reveal>
        <SimilarProducts product={product} />
      </Reveal>
    </div>
  );
}
