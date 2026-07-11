import ProductListing from '@/features/catalog/ProductListing.jsx';

/** StorePage (PLP) — the full catalogue. Thin wrapper over ProductListing. */
export default function StorePage() {
  return (
    <ProductListing
      eyebrow="All gear"
      title="Shop everything"
      seoTitle="Shop all gear — Helmets, Riding Gear & Parts | MotoPark"
      seoDescription="Browse the full MotoPark catalogue — genuine motorcycle helmets, riding gear, protection, luggage and parts. Filter by brand and price."
      canonical="https://motoparkvizag.in/store"
    />
  );
}
