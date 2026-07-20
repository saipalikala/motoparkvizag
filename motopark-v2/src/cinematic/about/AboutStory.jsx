import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { STATS, VALUES, STORY_SECTIONS, CTA } from './aboutConfig.js';
import styles from './AboutStory.module.css';

/**
 * AboutStory — the brand narrative section that follows the cinematic sequence.
 *
 * Content is sourced from aboutConfig.js (which draws from STORE config and the
 * original motopark-web About page). No external component imports — completely
 * self-contained within src/cinematic/about/.
 *
 * ANIMATIONS
 * ─────────────────────────────────────────────────────────────────────────────
 * • Reveal: IntersectionObserver adds the `.revealed` class when sections enter
 *   the viewport. CSS handles the transition. Zero JS animation loops.
 * • Stats: count-up via setInterval triggered once by IntersectionObserver.
 *   Direct DOM write to `textContent` — no React state, no re-renders.
 */

// ─── Count-up (direct DOM, no React state) ─────────────────────────────────

function StatCounter({ value, suffix, label }) {
  const numRef = useRef(null);

  useEffect(() => {
    const el = numRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();

        const duration = 1400;
        const step = value / (duration / 16);
        let current = 0;

        const timer = setInterval(() => {
          current = Math.min(current + step, value);
          el.textContent = Math.floor(current).toLocaleString('en-IN');
          if (current >= value) {
            el.textContent = value.toLocaleString('en-IN');
            clearInterval(timer);
          }
        }, 16);

        return () => clearInterval(timer);
      },
      { threshold: 0.6 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);

  return (
    <div className={styles.stat}>
      <span className={styles.statNum}>
        <span ref={numRef}>0</span>
        <span className={styles.statSuffix}>{suffix}</span>
      </span>
      <span className={styles.statLabel}>{label}</span>
    </div>
  );
}

// ─── Value card SVG icons ───────────────────────────────────────────────────

function ValueIcon({ v }) {
  if (v.id === 'genuine') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={v.svgPath} />
      </svg>
    );
  }
  if (v.id === 'safety') {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d={v.svgPath} />
      </svg>
    );
  }
  // community
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={v.svgPath} />
      <circle cx={v.circleAttrs.cx} cy={v.circleAttrs.cy} r={v.circleAttrs.r} />
      {v.extraPaths?.map((p, i) => <path key={i} d={p} />)}
    </svg>
  );
}

// ─── Reveal hook ───────────────────────────────────────────────────────────

function useReveal(containerRef) {
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targets = container.querySelectorAll('[data-reveal]');
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add(styles.revealed);
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    );

    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [containerRef]);
}

// ─── Main component ─────────────────────────────────────────────────────────

export default function AboutStory() {
  const navigate = useNavigate();
  const sectionRef = useRef(null);
  useReveal(sectionRef);

  return (
    <div ref={sectionRef} className={styles.story}>

      {/* ══ ARRIVAL TITLE ════════════════════════════════════════════════ */}
      <section className={styles.arrivalSection}>
        <div className={styles.arrivalInner}>
          <p
            className={`${styles.eyebrow} ${styles.eyebrowLight}`}
            data-reveal
            style={{ transitionDelay: '0ms' }}
          >
            Est. 2020 · Visakhapatnam
          </p>
          <h1
            className={styles.arrivalHeading}
            data-reveal
            style={{ transitionDelay: '80ms' }}
          >
            We Are<br />MotoPark.
          </h1>
          <p
            className={styles.arrivalSub}
            data-reveal
            style={{ transitionDelay: '160ms' }}
          >
            Premium riding gear for modern riders —<br />
            built on passion, trust, and performance.
          </p>
        </div>
      </section>

      {/* ══ STATS ════════════════════════════════════════════════════════ */}
      <section className={styles.statsSection}>
        <div className={styles.statsGrid}>
          {STATS.map((s) => (
            <StatCounter key={s.label} {...s} />
          ))}
        </div>
      </section>

      {/* ══ STORY SECTIONS ══════════════════════════════════════════════ */}
      {STORY_SECTIONS.map((section, sIdx) => (
        <section key={section.id} className={styles.storySection}>
          <div className={styles.storyContainer}>
            <div className={styles.storyGrid}>
              <div className={styles.storyLeft}>
                <p
                  className={styles.eyebrow}
                  data-reveal
                  style={{ transitionDelay: '0ms' }}
                >
                  {section.eyebrow}
                </p>
                <h2
                  className={styles.storyHeading}
                  data-reveal
                  style={{ transitionDelay: '80ms' }}
                >
                  {section.heading.split('\n').map((line, i) => (
                    <span key={i} style={{ display: 'block' }}>{line}</span>
                  ))}
                </h2>
              </div>
              <div className={styles.storyRight}>
                {section.body.map((para, i) => (
                  <p
                    key={i}
                    className={styles.storyPara}
                    data-reveal
                    style={{ transitionDelay: `${(i + 1) * 80}ms` }}
                  >
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </div>
          {/* Divider between story sections */}
          {sIdx < STORY_SECTIONS.length - 1 && (
            <div className={styles.storySeparator} aria-hidden="true" />
          )}
        </section>
      ))}

      {/* ══ VALUES ══════════════════════════════════════════════════════ */}
      <section className={styles.valuesSection}>
        <div className={styles.valuesContainer}>
          <div
            className={styles.valuesHeader}
            data-reveal
          >
            <p className={styles.eyebrow}>What We Stand For</p>
            <h2 className={styles.valuesHeading}>Our Values</h2>
          </div>
          <div className={styles.valuesGrid}>
            {VALUES.map((v, i) => (
              <div
                key={v.id}
                className={styles.valueCard}
                data-reveal
                style={{ transitionDelay: `${i * 100}ms` }}
              >
                <div className={styles.valueIconWrap}>
                  <ValueIcon v={v} />
                </div>
                <h3 className={styles.valueTitle}>{v.title}</h3>
                <p className={styles.valueDesc}>{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ CTA ══════════════════════════════════════════════════════════ */}
      <section className={styles.ctaSection}>
        <div className={styles.ctaInner}>
          <div className={styles.ctaBg} aria-hidden="true" />
          <p
            className={`${styles.eyebrow} ${styles.eyebrowLight} ${styles.eyebrowDim}`}
            data-reveal
          >
            {CTA.eyebrow}
          </p>
          <h2
            className={styles.ctaHeading}
            data-reveal
            style={{ transitionDelay: '80ms' }}
          >
            {CTA.heading.split('\n').map((line, i) => (
              <span key={i} style={{ display: 'block' }}>{line}</span>
            ))}
          </h2>
          <p
            className={styles.ctaSub}
            data-reveal
            style={{ transitionDelay: '160ms' }}
          >
            {CTA.sub}
          </p>
          <button
            className={styles.ctaBtn}
            onClick={() => navigate(CTA.href)}
            data-reveal
            style={{ transitionDelay: '240ms' }}
            type="button"
          >
            {CTA.button}
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
              <path
                d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11"
                stroke="currentColor" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </section>

    </div>
  );
}
