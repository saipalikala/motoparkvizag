import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Button from '@/components/ui/Button.jsx';
import styles from './StaticPage.module.css';

/** 404 — off-route catch-all. noindex. */
export default function NotFoundPage() {
  return (
    <div
      className="container section"
      style={{ textAlign: 'center', display: 'grid', gap: 'var(--space-4)', placeItems: 'center' }}
    >
      <Helmet>
        <title>Page not found — MotoPark</title>
        <meta name="robots" content="noindex" />
      </Helmet>
      <p className={styles.eyebrow}>Error 404</p>
      <h1 className={styles.title}>This road doesn&rsquo;t exist</h1>
      <p style={{ color: 'var(--text-secondary)', maxWidth: '46ch' }}>
        The page you&rsquo;re looking for may have moved or sold out. Let&rsquo;s get you back on route.
      </p>
      <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap', justifyContent: 'center' }}>
        <Button as={Link} to="/" variant="primary">
          Back home
        </Button>
        <Button as={Link} to="/store" variant="outline">
          Shop all gear
        </Button>
      </div>
    </div>
  );
}
