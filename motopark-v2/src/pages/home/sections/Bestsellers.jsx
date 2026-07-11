import SectionHeader from '@/components/commerce/SectionHeader.jsx';
import ProductGrid from '@/components/commerce/ProductGrid.jsx';

/**
 * Bestsellers — Concept C §11 "Riders' favourites" (grounded in V1 `trending`).
 * Header + shared ProductGrid; renders nothing if there's no trending data.
 */
export default function Bestsellers({ products = [], loading = false }) {
  if (!loading && products.length === 0) return null;

  return (
    <section className="container section" aria-labelledby="best-title">
      <SectionHeader
        id="best-title"
        eyebrow="What Vizag actually buys"
        title="Riders’ favourites"
        action={{ label: 'Shop all', href: '/store' }}
      />
      <ProductGrid products={products} loading={loading} count={8} />
    </section>
  );
}
