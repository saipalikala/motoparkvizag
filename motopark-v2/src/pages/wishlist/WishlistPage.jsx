import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Heart } from 'lucide-react';
import ProductGrid from '@/components/commerce/ProductGrid.jsx';
import Button from '@/components/ui/Button.jsx';
import { useWishlist } from '@/contexts/WishlistContext.jsx';
import styles from './WishlistPage.module.css';

/**
 * WishlistPage `/wishlist` — saved cards from WishlistContext, rendered with the
 * shared ProductGrid (cards keep their own heart toggle). noindex.
 */
export default function WishlistPage() {
  const { items, count, clear } = useWishlist();

  return (
    <div className="container section">
      <Helmet>
        <title>Your wishlist — MotoPark</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className={styles.head}>
        <h1 className={styles.title}>Your wishlist</h1>
        {count > 0 && (
          <button type="button" className={styles.clear} onClick={clear}>
            Clear all
          </button>
        )}
      </div>

      {count === 0 ? (
        <div className={styles.empty}>
          <span className={styles.icon} aria-hidden="true">
            <Heart size={26} strokeWidth={1.6} />
          </span>
          <p className={styles.emptyTitle}>Your wishlist is empty</p>
          <p className={styles.emptyText}>
            Tap the heart on any product to save it here for later.
          </p>
          <Button as={Link} to="/store" variant="primary">
            Explore gear
          </Button>
        </div>
      ) : (
        <ProductGrid products={items} count={items.length} />
      )}
    </div>
  );
}
