import { useParams } from 'react-router-dom';
import ProductListing from '@/features/catalog/ProductListing.jsx';
import { useNav } from '@/contexts/NavContext.jsx';

const deSlug = (slug) => (slug || '').replace(/-/g, ' ');

/**
 * BikeMakePage `/bikes/:make` — every product whose fitment includes ANY model of
 * this make (Milestone 10: `bikeMake` → structured compatibleBikes lookup, which
 * replaced the old best-effort product-name text search).
 *
 * The label comes from live nav data; the de-slugged param is only a cosmetic
 * fallback while nav loads. Results never depend on it — the slug drives the query.
 */
export default function BikeMakePage() {
  const { make } = useParams();
  const { bikes } = useNav();

  const name = bikes.find((g) => g.makeSlug === make)?.make || deSlug(make);

  return (
    <ProductListing
      bikeMake={make}
      eyebrow="Shop by bike"
      title={`Gear for ${name}`}
      seoTitle={`${name} gear — MotoPark`}
      seoDescription={`Motorcycle gear and parts that fit your ${name} at MotoPark.`}
      canonical={`https://motoparkvizag.in/bikes/${make}`}
    />
  );
}
