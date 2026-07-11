import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { formatINR } from '@/lib/format.js';
import { cloudinaryUrl } from '@/lib/image.js';
import heroImg from '@/assets/hero.jpg';
import styles from './Hero.module.css';

/**
 * Homepage Hero — Concept C "Cinematic Hybrid" (docs/10 §C-5).
 * Navy-800 cinematic frame over a warm-lit photograph, headline bottom-left,
 * dual CTA, and a slim SHOPPABLE product ticker peeking into the fold (3 cards
 * = products reachable in viewport #1, Commerce Law 1). Static image only — no
 * hero video in this pass (Motion Doctrine: video is a later, guarded add).
 *
 * Props:
 *   products — up to 3 UI-ready cards ({ id, name, brand, priceINR, image, url })
 *   loading  — show skeleton ticker while home-data resolves
 */
export default function Hero({ products = [], loading = false }) {
  const ticker = products.slice(0, 3);

  return (
    <section className={styles.hero} aria-label="Welcome to MotoPark">
      {/* Cinematic media layer — navy base + warm photo + scrim for AA text */}
      <div className={styles.media} aria-hidden="true">
        <img
          src={heroImg}
          alt=""
          className={styles.photo}
          fetchPriority="high"
          decoding="async"
          width="1600"
          height="900"
        />
        <div className={styles.scrim} />
      </div>

      <div className={`container ${styles.inner}`}>
        <div className={styles.copy}>
          <p className={styles.eyebrow}>
            <ShieldCheck size={15} strokeWidth={2} aria-hidden="true" />
            Genuine gear · Est. 2020 · Vizag → Pan-India
          </p>
          <h1 className={`display ${styles.headline}`}>
            Gear for every ride.
          </h1>
          <p className={styles.subline}>
            Helmets, riding gear, protection and parts — genuine brands only,
            picked by riders and shipped from Vizag across India.
          </p>
          <div className={styles.ctas}>
            <Button as={Link} to="/store" variant="primary" size="lg">
              Shop the gear
              <ArrowRight size={18} strokeWidth={2} aria-hidden="true" />
            </Button>
            <Button as="a" href="#trust" variant="outline" size="lg" onDark>
              Why riders choose us
            </Button>
          </div>
        </div>

        {/* Shoppable ticker — the fold's product access */}
        <div className={styles.ticker} aria-label="Featured products">
          {loading && ticker.length === 0
            ? Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={styles.tickCard} aria-hidden="true">
                  <div className={`skeleton ${styles.tickThumb}`} />
                  <div className={styles.tickBody}>
                    <div className={`skeleton ${styles.tickLineSm}`} />
                    <div className={`skeleton ${styles.tickLine}`} />
                    <div className={`skeleton ${styles.tickLineSm}`} />
                  </div>
                </div>
              ))
            : ticker.map((p) => (
                <Link key={p.id} to={p.url} className={styles.tickCard}>
                  <div className={styles.tickThumb}>
                    {p.image ? (
                      <img
                        src={cloudinaryUrl(p.image, { w: 160 })}
                        alt={p.name}
                        loading="lazy"
                        decoding="async"
                        width="72"
                        height="90"
                      />
                    ) : (
                      <span className={styles.tickFallback} aria-hidden="true">
                        MP
                      </span>
                    )}
                  </div>
                  <div className={styles.tickBody}>
                    {p.brand && <span className={styles.tickBrand}>{p.brand}</span>}
                    <span className={styles.tickName}>{p.name}</span>
                    <span className={`price ${styles.tickPrice}`}>
                      {formatINR(p.priceINR)}
                    </span>
                  </div>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
}
