import ProductListing from '@/features/catalog/ProductListing.jsx';
import ShopByBike from '@/components/commerce/ShopByBike.jsx';

/**
 * StorePage (PLP) — the full catalogue. Thin wrapper over ProductListing, with
 * the fitment picker above it: on the "everything" listing, narrowing by bike is
 * the shopper's fastest route out of 48 unfiltered products. It routes to
 * /bikes/:make(/:model) rather than filtering in place, so fitment stays
 * route-driven (docs/11 §4) instead of becoming a URL filter.
 */
export default function StorePage() {
  return (
    <>
      <ShopByBike />
      <ProductListing
        eyebrow="All gear"
        title="Shop everything"
        seoTitle="Shop all gear — Helmets, Riding Gear & Parts | MotoPark"
        seoDescription="Browse the full MotoPark catalogue — genuine motorcycle helmets, riding gear, protection, luggage and parts. Filter by brand and price."
        canonical="https://motoparkvizag.in/store"
      />
    </>
  );
}
