import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ProductListing from '@/features/catalog/ProductListing.jsx';
import Button from '@/components/ui/Button.jsx';
import { getCategories } from '@/services/categories.js';

/**
 * CategoryPage `/c/:slug` — a ProductListing locked to one category. V1 filters
 * products by category id or exact name (NOT slug), so we resolve slug → category
 * via /api/categories first, then pass its id to the listing.
 */
export default function CategoryPage() {
  const { slug } = useParams();
  const [cat, setCat] = useState(undefined); // undefined = loading, null = not found

  useEffect(() => {
    let alive = true;
    setCat(undefined);
    getCategories()
      .then((list) => alive && setCat(list.find((c) => c.slug === slug) || null))
      .catch(() => alive && setCat(null));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (cat === undefined) {
    return (
      <div className="container section" aria-busy="true">
        <Helmet>
          <meta name="robots" content="noindex" />
        </Helmet>
        <p style={{ color: 'var(--text-secondary)' }}>Loading category…</p>
      </div>
    );
  }

  if (cat === null) {
    return (
      <div
        className="container section"
        style={{ textAlign: 'center', display: 'grid', gap: 'var(--space-4)', placeItems: 'center' }}
      >
        <Helmet>
          <title>Category not found — MotoPark</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <h1>Category not found</h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          We couldn&rsquo;t find that category. Browse everything instead.
        </p>
        <Button as={Link} to="/store" variant="primary">
          Shop all gear
        </Button>
      </div>
    );
  }

  return (
    <ProductListing
      category={cat.id}
      eyebrow="Category"
      title={cat.name}
      seoTitle={`${cat.name} — MotoPark`}
      seoDescription={`Shop ${cat.name} at MotoPark — genuine motorcycle gear, filtered by brand and price, shipped across India.`}
      canonical={`https://motoparkvizag.in/c/${cat.slug}`}
    />
  );
}
