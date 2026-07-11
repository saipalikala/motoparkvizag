import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { getCollections } from '@/services/collections.js';
import { cloudinaryUrl } from '@/lib/image.js';
import styles from './CollectionsPage.module.css';

/**
 * CollectionsPage `/collections` — curated collection tiles (cover = first
 * product image). Links to /collections/:slug.
 */
export default function CollectionsPage() {
  const [collections, setCollections] = useState(null);

  useEffect(() => {
    let alive = true;
    getCollections()
      .then((c) => alive && setCollections(c))
      .catch(() => alive && setCollections([]));
    return () => {
      alive = false;
    };
  }, []);

  const loading = collections === null;
  const list = (collections || []).filter((c) => c.count > 0);

  return (
    <div className="container section">
      <Helmet>
        <title>Collections — MotoPark</title>
        <meta
          name="description"
          content="Shop curated MotoPark collections — hand-picked motorcycle gear grouped for every kind of ride."
        />
        <link rel="canonical" href="https://motoparkvizag.in/collections" />
      </Helmet>

      <header className={styles.head}>
        <p className={styles.eyebrow}>Curated by MotoPark</p>
        <h1 className={styles.title}>Collections</h1>
      </header>

      {loading ? (
        <div className={styles.grid}>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`skeleton ${styles.skel}`} aria-hidden="true" />
          ))}
        </div>
      ) : list.length === 0 ? (
        <p className={styles.empty}>No collections yet — check back soon.</p>
      ) : (
        <div className={styles.grid}>
          {list.map((c) => (
            <Link key={c.id} to={c.url} className={styles.tile}>
              <div className={styles.cover}>
                {c.cover ? (
                  <img src={cloudinaryUrl(c.cover, { w: 600 })} alt="" loading="lazy" decoding="async" />
                ) : (
                  <span className={styles.coverFallback} aria-hidden="true">MP</span>
                )}
                <span className={styles.scrim} aria-hidden="true" />
              </div>
              <div className={styles.tileText}>
                <span className={styles.tileName}>{c.name}</span>
                <span className={styles.tileCount}>
                  {c.count} product{c.count === 1 ? '' : 's'}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
