import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./About.css";

const stats = [
  { value: 5000, label: "Happy Riders", suffix: "+" },
  { value: 120, label: "Products", suffix: "+" },
  { value: 25, label: "Trusted Brands", suffix: "+" },
  { value: 4, label: "Years Est.", suffix: "+" },
];

const values = [
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
    title: "Premium Quality",
    desc: "Only top-tier materials and rigorously tested safety gear make it to our shelves."
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 6v6l4 2" />
      </svg>
    ),
    title: "Modern Design",
    desc: "Clean, purposeful gear built for the modern rider — without compromising function."
  },
  {
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    title: "Rider Community",
    desc: "Thousands of riders trust MotoPark daily. We're built by riders, for riders."
  },
];

/* ─── COUNT-UP HOOK ─── */
const useCountUp = (ref, target, duration = 1200) => {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();

      let start = 0;
      const step = target / (duration / 16);
      const timer = setInterval(() => {
        start += step;
        if (start >= target) {
          el.textContent = target.toLocaleString("en-IN") + "+";
          clearInterval(timer);
        } else {
          el.textContent = Math.floor(start).toLocaleString("en-IN") + "+";
        }
      }, 16);
    }, { threshold: 0.5 });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);
};

const StatCounter = ({ value, label, suffix }) => {
  const ref = useRef(null);
  useCountUp(ref, value);
  return (
    <div className="about-stat">
      <span className="about-stat-num" ref={ref}>0+</span>
      <span className="about-stat-label">{label}</span>
    </div>
  );
};

const About = () => {
  const navigate = useNavigate();

  /* fade-in on scroll */
  useEffect(() => {
    const els = document.querySelectorAll(".about-reveal");
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add("about-reveal--in"); }),
      { threshold: 0.15 }
    );
    els.forEach(el => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className="about-page">

      {/* ── HERO ── */}
      <section className="about-hero">
        <div className="about-hero-bg" aria-hidden="true" />
        <div className="about-hero-content">
          <p className="about-eyebrow">Est. 2020 · Visakhapatnam</p>
          <h1 className="about-hero-title">We Are<br />MotoPark.</h1>
          <p className="about-hero-sub">
            Premium riding gear for modern riders — built on passion, trust, and performance.
          </p>
          <div className="about-hero-actions">
            <button className="about-hero-cta" onClick={() => navigate("/store")}>
              Explore Store
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button className="about-hero-ghost" onClick={() => navigate("/contact")}>
              Contact Us
            </button>
          </div>
        </div>
        <div className="about-hero-scroll" aria-hidden="true">
          <div className="about-hero-scroll-line"><div className="about-hero-scroll-dot" /></div>
          <span>Scroll</span>
        </div>
      </section>

      {/* ── STORY ── */}
      <section className="about-story about-reveal">
        <div className="about-container about-story-grid">
          <div className="about-story-left">
            <p className="about-section-eyebrow">Our Story</p>
            <h2 className="about-section-title">Born from a passion<br />for the road.</h2>
          </div>
          <div className="about-story-right">
            <p>
              MotoPark was founded by riders who couldn't find gear that matched their
              standards — quality that looked as good as it performed.
            </p>
            <p>
              Starting in Visakhapatnam in 2020, we've grown from a single store into
              a trusted destination for thousands of riders across India who demand
              both style and safety from every kilometre.
            </p>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="about-stats-section">
        <div className="about-container">
          <div className="about-stats-grid">
            {stats.map((s, i) => (
              <StatCounter key={i} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* ── VALUES ── */}
      <section className="about-values-section about-reveal">
        <div className="about-container">
          <div className="about-values-header">
            <p className="about-section-eyebrow">What We Stand For</p>
            <h2 className="about-section-title">Our Values</h2>
          </div>
          <div className="about-values-grid">
            {values.map((v, i) => (
              <div className="about-value-card" key={i}
                style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="about-value-icon">{v.icon}</div>
                <h3 className="about-value-title">{v.title}</h3>
                <p className="about-value-desc">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="about-cta about-reveal">
        <div className="about-cta-inner">
          <div className="about-cta-bg" aria-hidden="true" />
          <p className="about-section-eyebrow" style={{ color: "rgba(255,255,255,0.5)" }}>
            Ready to ride?
          </p>
          <h2 className="about-cta-title">Gear up.<br />Ride on.</h2>
          <p className="about-cta-sub">
            Browse our full collection of premium motorcycle gear.
          </p>
          <button className="about-cta-btn" onClick={() => navigate("/store")}>
            Explore the Store
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M2.5 7H11.5M7.5 3L11.5 7L7.5 11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </section>

    </div>
  );
};

export default About;