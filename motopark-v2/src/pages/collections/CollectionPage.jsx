import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import ProductGrid from '@/components/commerce/ProductGrid.jsx';
import SectionHeader from '@/components/commerce/SectionHeader.jsx';
import Button from '@/components/ui/Button.jsx';
import { getCollections } from '@/services/collections.js';

/**
 * CollectionPage `/collections/:slug` — resolves the collection from the full
 * list (no per-slug endpoint) and renders its populated products.
 */
export default function CollectionPage() {
  const { slug } = useParams();
  const [collection, setCollection] = useState(undefined); // undefined loading, null not found

  useEffect(() => {
    let alive = true;
    setCollection(undefined);
    getCollections()
      .then((list) => alive && setCollection(list.find((c) => c.slug === slug) || null))
      .catch(() => alive && setCollection(null));
    return () => {
      alive = false;
    };
  }, [slug]);

  if (collection === undefined) {
    return (
      <div className="container section" aria-busy="true">
        <Helmet><meta name="robots" content="noindex" /></Helmet>
        <p style={{ color: 'var(--text-secondary)' }}>Loading collection…</p>
      </div>
    );
  }

  if (collection === null) {
    return (
      <div className="container section" style={{ textAlign: 'center', display: 'grid', gap: 'var(--space-4)', placeItems: 'center' }}>
        <Helmet><title>Collection not found — MotoPark</title><meta name="robots" content="noindex" /></Helmet>
        <h1>Collection not found</h1>
        <Button as={Link} to="/collections" variant="primary">All collections</Button>
      </div>
    );
  }

  return (
    <div className="container section">
      <Helmet>
        <title>{`${collection.name} — Collections | MotoPark`}</title>
        <meta name="description" content={`Shop the ${collection.name} collection at MotoPark.`} />
        <link rel="canonical" href={`https://motoparkvizag.in/collections/${collection.slug}`} />
      </Helmet>

      <SectionHeader
        as="h1"
        eyebrow="Collection"
        title={collection.name}
        action={{ label: 'All collections', href: '/collections' }}
      />
      <ProductGrid products={collection.products} count={collection.products.length} />
    </div>
  );
}
