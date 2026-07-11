import { useParams } from 'react-router-dom';
import ProductListing from '@/features/catalog/ProductListing.jsx';
import { BIKE_MENU } from '@/config/nav.js';

const makeLabel = (slug) =>
  BIKE_MENU.find((b) => b.slug === slug)?.label || (slug || '').replace(/-/g, ' ');

/**
 * BikeMakePage `/bikes/:make` — honest best-effort: V1 has no fitment data, so
 * this searches product NAMES for the make (ProductListing search). Results can
 * be sparse; the listing's empty state covers "no matches".
 */
export default function BikeMakePage() {
  const { make } = useParams();
  const name = makeLabel(make);
  return (
    <ProductListing
      search={name}
      eyebrow="Shop by bike"
      title={`Gear for ${name}`}
      seoTitle={`${name} gear — MotoPark`}
      seoDescription={`Motorcycle gear and parts that mention ${name} at MotoPark.`}
      canonical={`https://motoparkvizag.in/bikes/${make}`}
    />
  );
}
