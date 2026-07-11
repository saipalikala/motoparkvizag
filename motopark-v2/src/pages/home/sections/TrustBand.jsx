import { Link } from 'react-router-dom';
import { ShieldCheck, Users, Award, Truck, MapPin } from 'lucide-react';
import { STORE } from '@/config/store.js';
import styles from './TrustBand.module.css';

/**
 * Trust band — Concept C §12 (trust precedes every conversion cluster). Only
 * verifiable identity facts; no fabricated rating/phone. Anchor `#trust` is the
 * hero's "Why riders choose us" CTA target. Warm cream-200 surface.
 */
const PILLARS = [
  { Icon: ShieldCheck, title: 'Genuine gear only', copy: 'Every product sourced direct — no fakes, ever.' },
  { Icon: Users, title: `${STORE.ridersServed} riders served`, copy: 'Trusted by riders across India since 2020.' },
  { Icon: Award, title: `${STORE.brandsCount} trusted brands`, copy: 'Axor, SMK, Viaterra, SHAD and more.' },
  { Icon: Truck, title: 'Pan-India shipping', copy: `Free over ₹${STORE.freeShipThreshold.toLocaleString('en-IN')}.` },
];

export default function TrustBand() {
  return (
    <section id="trust" className={styles.band} aria-labelledby="trust-title">
      <div className="container">
        <h2 id="trust-title" className="visually-hidden">
          Why riders choose MotoPark
        </h2>

        <ul className={styles.pillars}>
          {PILLARS.map(({ Icon, title, copy }) => (
            <li key={title} className={styles.pillar}>
              <span className={styles.iconWrap} aria-hidden="true">
                <Icon size={22} strokeWidth={1.7} />
              </span>
              <div>
                <p className={styles.pTitle}>{title}</p>
                <p className={styles.pCopy}>{copy}</p>
              </div>
            </li>
          ))}
        </ul>

        <div className={styles.showroom}>
          <MapPin size={16} strokeWidth={1.8} aria-hidden="true" />
          <span>
            Real shop, real riders — {STORE.area}, {STORE.city}. Est.{' '}
            {STORE.established}.
          </span>
          <Link to="/about" className={styles.showroomLink}>
            About us
          </Link>
        </div>
      </div>
    </section>
  );
}
