import { useEffect, useState } from 'react';
import SectionHeader from '@/components/commerce/SectionHeader.jsx';
import ProductGrid from '@/components/commerce/ProductGrid.jsx';
import { getProducts } from '@/services/products.js';

/**
 * SimilarProducts — "Similar Products" section for the PDP.
 *
 * Reuses getProducts() from the services layer — no backend changes needed.
 * Similarity priority mirrors the catalogue's natural organisation:
 *   1. Same brand + same category  (most precise)
 *   2. Same category only           (fallback: category cohesion)
 *   3. Same brand only              (fallback: brand loyalty)
 *   4. null                         (< 2 meaningful results → render nothing)
 *
 * Pattern matches Bestsellers / NewArrivals: SectionHeader + ProductGrid.
 * Co-located with ProductPage.jsx per the project's page-feature convention.
 */
export default function SimilarProducts({ product }) {
  const [similar, setSimilar] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!product) return;
    let alive = true;

    async function fetchSimilar() {
      setLoading(true);
      setSimilar([]);

      // Fetch a few extra so filtering the current product still leaves 4.
      const LIMIT = 9;
      const exclude = (arr) => arr.filter((p) => p.id !== product.id).slice(0, 4);

      // Work through each attempt in priority order; stop at first viable result.
      const attempts = [
        { brand: product.brand, category: product.category },
        { category: product.category },
        { brand: product.brand },
      ];

      for (const params of attempts) {
        try {
          const { products } = await getProducts({ ...params, limit: LIMIT });
          const results = exclude(products);
          if (results.length >= 2) {
            if (alive) {
              setSimilar(results);
              setLoading(false);
            }
            return;
          }
        } catch {
          // Silently continue to next priority — a network error on the
          // recommendations section must never break the main product page.
        }
      }

      // All attempts exhausted with < 2 results.
      if (alive) setLoading(false);
    }

    fetchSimilar();

    return () => {
      alive = false;
    };
  // product.id is the stable identity — re-fetch when the user navigates PDP-to-PDP.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [product?.id]);

  // Show ProductGrid skeleton while loading; hide entirely if not enough results.
  if (!loading && similar.length < 2) return null;

  return (
    <section className="container section" aria-labelledby="similar-title">
      <SectionHeader
        id="similar-title"
        eyebrow="Explore more"
        title="Similar Products"
        action={{
          label: 'View all',
          href: `/store?category=${encodeURIComponent(product.category)}`,
        }}
      />
      <ProductGrid products={similar} loading={loading} count={4} />
    </section>
  );
}
