import { useParams } from 'react-router-dom';
import ProductListing from '@/features/catalog/ProductListing.jsx';
import { useNav } from '@/contexts/NavContext.jsx';

const deSlug = (slug) => (slug || '').replace(/-/g, ' ');

/**
 * BikeModelPage `/bikes/:make/:model` — products whose fitment names EXACTLY this
 * model (Milestone 10). The `make/model` slug pair goes to the backend as-is; it
 * resolves the Bike doc and filters on compatibleBikes, so a product appears here
 * only because an admin linked it — never because its name happened to match.
 *
 * Labels come from live nav data, with the de-slugged params as a cosmetic
 * fallback while nav loads. Results never depend on the label.
 */
export default function BikeModelPage() {
  const { make, model } = useParams();
  const { bikes } = useNav();

  const group = bikes.find((g) => g.makeSlug === make);
  const makeLabel = group?.make || deSlug(make);
  const modelLabel = group?.models?.find((m) => m.slug === model)?.label || deSlug(model);
  const name = `${makeLabel} ${modelLabel}`.trim();

  return (
    <ProductListing
      bike={`${make}/${model}`}
      eyebrow="Shop by bike"
      title={`Gear for ${name}`}
      seoTitle={`${name} gear — MotoPark`}
      seoDescription={`Motorcycle gear and parts that fit your ${name} at MotoPark.`}
      canonical={`https://motoparkvizag.in/bikes/${make}/${model}`}
    />
  );
}
