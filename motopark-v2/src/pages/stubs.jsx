import { Helmet } from 'react-helmet-async';

/**
 * TEMPORARY route stubs — replaced page-by-page during the build.
 * Each real page gets its own folder under src/pages/<name>/.
 * Stubs are noindex so nothing half-built ever gets crawled.
 */
function Stub({ title }) {
  return (
    <div className="container section">
      <Helmet>
        <title>{title} — MotoPark</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <h1>{title}</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: 'var(--space-3)' }}>
        Page under construction — MotoPark V2.
      </p>
    </div>
  );
}

export const HomePage = () => <Stub title="Home" />;
export const StorePage = () => <Stub title="Store" />;
export const CategoryPage = () => <Stub title="Category" />;
export const ProductPage = () => <Stub title="Product" />;
export const BrandPage = () => <Stub title="Brand" />;
export const BikesPage = () => <Stub title="Shop by Bike" />;
export const BikeMakePage = () => <Stub title="Bike Make" />;
export const BikeModelPage = () => <Stub title="Bike Model" />;
export const CollectionsPage = () => <Stub title="Collections" />;
export const CollectionPage = () => <Stub title="Collection" />;
export const SearchPage = () => <Stub title="Search" />;
export const CartPage = () => <Stub title="Cart" />;
export const CheckoutPage = () => <Stub title="Checkout" />;
export const WishlistPage = () => <Stub title="Wishlist" />;
export const LoginPage = () => <Stub title="Sign in" />;
export const TrackPage = () => <Stub title="Track Order" />;
export const AccountPage = () => <Stub title="Account" />;
export const StaticPage = ({ page }) => <Stub title={page} />;
export const NotFoundPage = () => <Stub title="Page not found" />;
