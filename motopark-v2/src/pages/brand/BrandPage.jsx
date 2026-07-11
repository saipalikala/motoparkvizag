import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ProductListing from '@/features/catalog/ProductListing.jsx';
import Button from '@/components/ui/Button.jsx';
import { getProductFilters } from '@/services/products.js';

/**
 * BrandPage `/brand/:slug` — V1 filters products by EXACT brand string, and the
 * catalog's brand strings are inconsistent (e.g. "RED ROOSTER PERFORMANCE").
 * So we resolve the slug against the real brand facets (exact slug, then prefix)
 * and lock the listing to that brand. Unknown/marketing-only brands → not found.
 */
const slugify = (s) =>
  (s || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export default function BrandPage() {
  const { slug } = useParams();
  const [brand, setBrand] = useState(undefined); // undefined loading, null not found, string found

  useEffect(() => {
    let alive = true;
    setBrand(undefined);
    getProductFilters()
      .then(({ brands }) => {
        if (!alive) return;
        const exact = brands.find((b) => slugify(b) === slug);
        const prefix =
          !exact &&
          brands.find((b) => slugify(b).startsWith(slug) || slug.startsWith(slugify(b)));
        setBrand(exact || prefix || null);
      })
      .catch(() => alive && setBrand(null));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (brand === undefined) {
    return (
      <div className="container section" aria-busy="true">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        <p style={{ color: 'var(--text-secondary)' }}>Loading brand…</p>
      </div>
    );
  }

  if (brand === null) {
    return (
      <div className="container section" style={{ textAlign: 'center', display: 'grid', gap: 'var(--space-4)', placeItems: 'center' }}>
        <Helmet><title>Brand not found — MotoPark</title><meta name="robots" content="noindex" /></Helmet>
        <h1>Brand not available</h1>
        <p style={{ color: 'var(--text-secondary)' }}>We don&rsquo;t carry that brand yet. Browse everything instead.</p>
        <Button as={Link} to="/store" variant="primary">Shop all gear</Button>
      </div>
    );
  }

  return (
    <ProductListing
      brand={brand}
      eyebrow="Brand"
      title={brand}
      seoTitle={`${brand} — MotoPark`}
      seoDescription={`Shop genuine ${brand} motorcycle gear at MotoPark, shipped across India.`}
      canonical={`https://motoparkvizag.in/brand/${slug}`}
    />
  );
}
