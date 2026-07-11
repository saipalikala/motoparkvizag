import { useParams } from 'react-router-dom';
import ProductListing from '@/features/catalog/ProductListing.jsx';
import { BIKE_MENU } from '@/config/nav.js';

const makeLabel = (slug) =>
  BIKE_MENU.find((b) => b.slug === slug)?.label || (slug || '').replace(/-/g, ' ');

/**
 * BikeModelPage `/bikes/:make/:model` — best-effort text search for "make model"
 * (no structured fitment in V1). Mirrors BikeMakePage.
 */
export default function BikeModelPage() {
  const { make, model } = useParams();
  const name = `${makeLabel(make)} ${(model || '').replace(/-/g, ' ')}`.trim();
  return (
    <ProductListing
      search={name}
      eyebrow="Shop by bike"
      title={`Gear for ${name}`}
      seoTitle={`${name} gear — MotoPark`}
      canonical={`https://motoparkvizag.in/bikes/${make}/${model}`}
    />
  );
}
