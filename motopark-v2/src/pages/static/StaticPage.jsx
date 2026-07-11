import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { MapPin, Phone, Mail, Clock, MessageCircle, ChevronDown, ExternalLink } from 'lucide-react';
import { STORE } from '@/config/store.js';
import { STATIC_CONTENT } from './content.js';
import styles from './StaticPage.module.css';

/**
 * StaticPage — renders About, FAQ, Contact and the policy pages from content.js
 * / config/store.js. `page` comes from the route. Contact is rendered specially
 * (real channels — no dead form); FAQ is an accordion; the rest are doc pages.
 */
export default function StaticPage({ page }) {
  if (page === 'contact') return <ContactPage />;

  const data = STATIC_CONTENT[page];
  if (!data) {
    return (
      <div className="container section">
        <Helmet><title>Page not found — MotoPark</title><meta name="robots" content="noindex" /></Helmet>
        <h1>Page not found</h1>
      </div>
    );
  }

  if (data.faqs) return <FaqPage data={data} />;

  return (
    <div className="container section">
      <Helmet>
        <title>{`${data.title} — MotoPark`}</title>
        {data.intro && <meta name="description" content={data.intro} />}
      </Helmet>
      <article className={styles.doc}>
        <header className={styles.docHead}>
          <h1 className={styles.title}>{data.title}</h1>
          {data.updated && <p className={styles.updated}>Last updated: {data.updated}</p>}
          {data.intro && <p className={styles.lede}>{data.intro}</p>}
        </header>
        {data.sections.map((s) => (
          <section key={s.h} className={styles.section}>
            <h2 className={styles.h2}>{s.h}</h2>
            {s.body.map((p, i) => (
              <p key={i} className={styles.p}>{p}</p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}

/* ── FAQ (accordion) ── */
function FaqPage({ data }) {
  const [open, setOpen] = useState(null);
  return (
    <div className="container section">
      <Helmet>
        <title>{`${data.title} — MotoPark`}</title>
        <meta name="description" content={data.intro} />
      </Helmet>
      <header className={styles.docHead}>
        <h1 className={styles.title}>{data.title}</h1>
        <p className={styles.lede}>{data.intro}</p>
      </header>
      <ul className={styles.faqList}>
        {data.faqs.map((f, i) => (
          <li key={f.q} className={styles.faqItem}>
            <button
              type="button"
              className={styles.faqQ}
              aria-expanded={open === i}
              onClick={() => setOpen(open === i ? null : i)}
            >
              <span>{f.q}</span>
              <ChevronDown
                size={18}
                strokeWidth={2}
                aria-hidden="true"
                className={open === i ? styles.chevOpen : ''}
              />
            </button>
            {open === i && <p className={styles.faqA}>{f.a}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ── Contact (real channels) ── */
function ContactPage() {
  const faqs = STATIC_CONTENT.faq.faqs.slice(0, 4);
  return (
    <div className="container section">
      <Helmet>
        <title>Contact MotoPark — Visakhapatnam</title>
        <meta name="description" content="Get in touch with MotoPark — call, WhatsApp, email, or visit our Visakhapatnam store." />
        <link rel="canonical" href="https://motoparkvizag.in/contact" />
      </Helmet>

      <header className={styles.docHead}>
        <p className={styles.eyebrow}>Get in touch</p>
        <h1 className={styles.title}>Contact MotoPark</h1>
        <p className={styles.lede}>Real riders, real support — we usually reply within 24 hours.</p>
      </header>

      <div className={styles.contactGrid}>
        <div className={styles.card}>
          <span className={styles.cardIcon} aria-hidden="true"><MapPin size={20} strokeWidth={1.7} /></span>
          <h2 className={styles.cardTitle}>Visit us</h2>
          <address className={styles.address}>
            {STORE.addressLines.map((l) => <span key={l}>{l}</span>)}
          </address>
          <a className={styles.cardLink} href={STORE.mapsUrl} target="_blank" rel="noreferrer">
            View on Maps <ExternalLink size={13} strokeWidth={2} aria-hidden="true" />
          </a>
        </div>

        <div className={styles.card}>
          <span className={styles.cardIcon} aria-hidden="true"><Phone size={20} strokeWidth={1.7} /></span>
          <h2 className={styles.cardTitle}>Call or message</h2>
          <a className={styles.cardBig} href={STORE.phoneHref}>{STORE.phone}</a>
          <div className={styles.cardActions}>
            <a className={styles.waBtn} href={STORE.whatsapp} target="_blank" rel="noreferrer">
              <MessageCircle size={15} strokeWidth={1.9} aria-hidden="true" /> WhatsApp
            </a>
            <a className={styles.cardLink} href={`mailto:${STORE.email}`}>
              <Mail size={14} strokeWidth={1.9} aria-hidden="true" /> {STORE.email}
            </a>
          </div>
        </div>

        <div className={styles.card}>
          <span className={styles.cardIcon} aria-hidden="true"><Clock size={20} strokeWidth={1.7} /></span>
          <h2 className={styles.cardTitle}>Store hours</h2>
          <ul className={styles.hours}>
            {STORE.hours.map((h) => (
              <li key={h.days}>
                <span>{h.days}</span>
                <span className={styles.hoursTime}>{h.time}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <section className={styles.contactFaq}>
        <h2 className={styles.h2}>Common questions</h2>
        <ul className={styles.faqPlain}>
          {faqs.map((f) => (
            <li key={f.q}>
              <p className={styles.faqPlainQ}>{f.q}</p>
              <p className={styles.faqA}>{f.a}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
