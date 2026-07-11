import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Search, Sparkles } from 'lucide-react';
import SectionHeader from '@/components/commerce/SectionHeader.jsx';
import ProductGrid from '@/components/commerce/ProductGrid.jsx';
import ProductListing from '@/features/catalog/ProductListing.jsx';
import { aiSearch } from '@/services/products.js';
import styles from './SearchPage.module.css';

/**
 * SearchPage `/search?q=` — the navbar search target. Primary path is SEMANTIC:
 * POST /api/ai/search ($vectorSearch over product embeddings) ranks by meaning,
 * not keyword. On empty/error/rate-limit it FALLS BACK to the keyword listing
 * (ProductListing → V1 /products search), so search never regresses.
 */

// Parse a simple price cap ("under 1500", "below ₹3,000", "< 2000") — mirrors the
// AI fast-path in aiController so "gloves under 1500" filters semantically too.
function parseMaxPrice(q) {
  const m = q.match(/(?:under|below|less than|upto|up to|<)\s*₹?\s*(\d[\d,]*)/i);
  return m ? Number(m[1].replace(/,/g, '')) : undefined;
}

export default function SearchPage() {
  const [params] = useSearchParams();
  const q = (params.get('q') || '').trim();

  const [status, setStatus] = useState('idle'); // idle | loading | ok | empty | error
  const [results, setResults] = useState([]);

  useEffect(() => {
    if (q.length < 2) {
      setStatus('idle');
      setResults([]);
      return;
    }
    let alive = true;
    setStatus('loading');
    aiSearch(q, { limit: 12, maxPrice: parseMaxPrice(q) })
      .then((cards) => {
        if (!alive) return;
        setResults(cards);
        setStatus(cards.length ? 'ok' : 'empty');
      })
      .catch(() => {
        if (alive) setStatus('error');
      });
    return () => {
      alive = false;
    };
  }, [q]);

  // Too-short query → prompt (unchanged).
  if (q.length < 2) {
    return (
      <div className={`container section ${styles.prompt}`}>
        <Helmet>
          <title>Search — MotoPark</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <span className={styles.icon} aria-hidden="true">
          <Search size={26} strokeWidth={1.6} />
        </span>
        <h1 className={styles.promptTitle}>Search MotoPark</h1>
        <p className={styles.promptText}>
          Type at least 2 characters — try “helmet”, “gloves”, or a brand.
        </p>
      </div>
    );
  }

  // Semantic path: loading skeletons or ranked results.
  if (status === 'loading' || status === 'ok') {
    return (
      <div className="container section">
        <Helmet>
          <title>{`Search: ${q} — MotoPark`}</title>
          <meta name="robots" content="noindex" />
        </Helmet>
        <SectionHeader as="h1" eyebrow="Smart search" title={`Results for “${q}”`} />
        <p className={styles.aiNote}>
          <Sparkles size={14} strokeWidth={1.8} aria-hidden="true" />
          AI-ranked by relevance to your search.
        </p>
        <ProductGrid products={results} loading={status === 'loading'} count={12} />
      </div>
    );
  }

  // Empty or error → keyword fallback (the existing, robust path).
  return (
    <ProductListing
      search={q}
      eyebrow="Search"
      title={`Results for “${q}”`}
      seoTitle={`Search: ${q} — MotoPark`}
    />
  );
}
