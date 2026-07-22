import ProductCard from './ProductCard.jsx';
import styles from './ProductGrid.module.css';

/**
 * ProductGrid — responsive 2/3/4-up grid of ProductCards with skeleton
 * fallback (reserves geometry → CLS 0). Shared by Bestsellers, New Arrivals,
 * and listing pages. Presentational; the caller owns the section header/data.
 */
export default function ProductGrid({ products = [], loading = false, count = 8 }) {
  const items = products.slice(0, count);

  if (loading && items.length === 0) {
    return (
      <div className={styles.grid}>
        {Array.from({ length: count }).map((_, i) => (
          <ProductCard.Skeleton key={i} />
        ))}
      </div>
    );
  }

  return (
    <div className={styles.grid}>
      {items.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
