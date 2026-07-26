import SectionHeader from '@/components/commerce/SectionHeader.jsx';
import ProductGrid from '@/components/commerce/ProductGrid.jsx';

/**
 * New arrivals — Concept C §4 (re-energises the back half). Grounded in V1
 * `newArrivals` (sorted newest first by the backend). Shared header + grid.
 */
export default function NewArrivals({ products = [], loading = false }) {
  if (!loading && products.length === 0) return null;

  return (
    <section className="container section" aria-labelledby="new-title">
      <SectionHeader
        id="new-title"
        eyebrow="Just landed"
        title="Fresh off the truck"
        action={{ label: 'Shop all', href: '/store' }}
      />
      <ProductGrid products={products} loading={loading} count={8} />
    </section>
  );
}
