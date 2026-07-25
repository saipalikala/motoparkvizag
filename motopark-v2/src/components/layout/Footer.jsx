import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Send, Check } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { CATEGORY_MENU, BRAND_MENU } from '@/config/nav.js';
import { STORE } from '@/config/store.js';
import logoBadge from '@/assets/images/logo-badge.png';
import styles from './Footer.module.css';

/**
 * Footer — global chrome (docs/09-design-system.md V2). Sits on the same
 * near-black page surface as everything else — no separate "dark moment"
 * tone to bookend anymore, so the old arc-divider seam is retired here too.
 * Pure presentational layer: config + local state only (no services — layer rule).
 * Newsletter is client-only for now (no subscribe endpoint in V1); when one lands
 * it becomes a features/newsletter form injected here. Social icons render only
 * when a URL exists in config/store.js (no dead links).
 */
const SUPPORT_LINKS = [
  { label: 'Track order', to: '/track' },
  { label: 'Shipping policy', to: '/shipping-policy' },
  { label: 'Returns policy', to: '/returns-policy' },
  { label: 'FAQ', to: '/faq' },
  { label: 'Contact us', to: '/contact' },
];

const COMPANY_LINKS = [
  { label: 'About MotoPark', to: '/about' },
  { label: 'All gear', to: '/store' },
  { label: 'Collections', to: '/collections' },
  { label: 'Shop by bike', to: '/bikes' },
];

/* Brand glyphs as inline SVGs — lucide dropped brand icons for trademark reasons. */
const svgBase = {
  width: 18,
  height: 18,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  'aria-hidden': true,
};
const IgIcon = () => (
  <svg {...svgBase}>
    <rect x="3" y="3" width="18" height="18" rx="5" />
    <circle cx="12" cy="12" r="4" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
  </svg>
);
const YtIcon = () => (
  <svg {...svgBase}>
    <rect x="2" y="5" width="20" height="14" rx="4" />
    <path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none" />
  </svg>
);
const FbIcon = () => (
  <svg {...svgBase}>
    <path d="M15 3h-3a4 4 0 0 0-4 4v3H5v4h3v7h4v-7h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

const SOCIALS = [
  { key: 'instagram', Icon: IgIcon, label: 'Instagram' },
  { key: 'youtube', Icon: YtIcon, label: 'YouTube' },
  { key: 'facebook', Icon: FbIcon, label: 'Facebook' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle | done | error

  const onSubmit = (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!EMAIL_RE.test(value)) {
      setStatus('error');
      return;
    }
    // No subscribe endpoint yet — keep intent locally so it isn't lost.
    try {
      localStorage.setItem('mp-newsletter-email', value);
    } catch {
      /* private mode — non-fatal */
    }
    setStatus('done');
  };

  const activeSocials = SOCIALS.filter((s) => STORE.social?.[s.key]);
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.top}`}>
        {/* Brand + newsletter */}
        <div className={styles.brandCol}>
          <Link to="/" className={styles.logo} aria-label="MotoPark — home">
            <img src={logoBadge} alt="" width="40" height="40" />
            <span className={styles.wordmark}>
              MOTO<em>PARK</em>
            </span>
          </Link>
          <p className={styles.tagline}>Genuine gear. No compromises.</p>

          <form className={styles.news} onSubmit={onSubmit} noValidate>
            <label htmlFor="news-email" className={styles.newsLabel}>
              Ride-ready deals, no spam.
            </label>
            {status === 'done' ? (
              <p className={styles.newsDone} role="status">
                <Check size={16} strokeWidth={1.8} aria-hidden="true" />
                Thanks — we&rsquo;ll be in touch.
              </p>
            ) : (
              <>
                <div className={styles.newsRow}>
                  <input
                    id="news-email"
                    type="email"
                    className={styles.newsInput}
                    placeholder="you@email.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (status === 'error') setStatus('idle');
                    }}
                    aria-invalid={status === 'error'}
                    aria-describedby={status === 'error' ? 'news-err' : undefined}
                  />
                  <Button type="submit" variant="primary" aria-label="Subscribe">
                    <Send size={16} strokeWidth={1.8} aria-hidden="true" />
                  </Button>
                </div>
                {status === 'error' && (
                  <p id="news-err" className={styles.newsErr} role="alert">
                    Please enter a valid email.
                  </p>
                )}
              </>
            )}
          </form>

          {activeSocials.length > 0 && (
            <div className={styles.socials}>
              {activeSocials.map(({ key, Icon, label }) => (
                <a
                  key={key}
                  href={STORE.social[key]}
                  className={styles.social}
                  aria-label={label}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  <Icon />
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Link columns */}
        <nav className={styles.cols} aria-label="Footer">
          <div className={styles.col}>
            <h3 className={styles.colTitle}>Shop</h3>
            <ul>
              {CATEGORY_MENU.slice(0, 6).map((c) => (
                <li key={c.slug}>
                  <Link to={`/c/${c.slug}`}>{c.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h3 className={styles.colTitle}>Brands</h3>
            <ul>
              {BRAND_MENU.slice(0, 6).map((b) => (
                <li key={b.slug}>
                  <Link to={`/brand/${b.slug}`}>{b.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h3 className={styles.colTitle}>Support</h3>
            <ul>
              {SUPPORT_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.col}>
            <h3 className={styles.colTitle}>Company</h3>
            <ul>
              {COMPANY_LINKS.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </div>
        </nav>
      </div>

      {/* Trust + payments */}
      <div className={`container ${styles.trustRow}`}>
        <p className={styles.trustItem}>
          <ShieldCheck size={15} strokeWidth={1.8} aria-hidden="true" />
          Genuine gear · Est. {STORE.established} · {STORE.city}
        </p>
        <div className={styles.pay} aria-label="Accepted payments">
          {['UPI', 'Cards', 'Netbanking', 'Razorpay secured'].map((p) => (
            <span key={p} className={styles.payBadge}>
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom bar */}
      <div className={`container ${styles.bottom}`}>
        <p className={styles.copy}>© {year} MotoPark. All rights reserved.</p>
        <ul className={styles.legal}>
          <li>
            <Link to="/privacy-policy">Privacy</Link>
          </li>
          <li>
            <Link to="/terms">Terms</Link>
          </li>
          <li>
            <Link to="/shipping-policy">Shipping</Link>
          </li>
          <li>
            <Link to="/returns-policy">Returns</Link>
          </li>
        </ul>
      </div>
    </footer>
  );
}
