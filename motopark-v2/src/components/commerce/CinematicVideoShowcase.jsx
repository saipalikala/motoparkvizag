import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, X } from 'lucide-react';
import { getShowcaseSlides } from '@/services/videoShowcase.js';
import styles from './CinematicVideoShowcase.module.css';

/**
 * CinematicVideoShowcase — full-bleed "Cinematic Theater" (Concept C).
 *
 * One featured video fills an 85vh stage as a poster-first background; a bottom
 * filmstrip navigates the other clips.
 *
 * Motion split (deliberate):
 *   • framer-motion (via LazyMotion → only the small `domAnimation` feature set
 *     ships) drives the smooth BACKGROUND CROSSFADE on slide change
 *     (AnimatePresence) and the filmstrip hover-lift — the requested premium
 *     touches.
 *   • The play/pause show-hide of the chrome is plain CSS opacity (a class
 *     toggle). It's deterministic, honors prefers-reduced-motion at the CSS
 *     layer, and avoids animating a node whose inline `style` also changes.
 *
 * Motion Doctrine: poster-first — the stage is just the high-res poster; the
 * <video> is preload="none" and only fetches when the user clicks Play. No
 * autoplay, no continuous animation.
 *
 * Data: slides come from GET /api/video-showcase (managed in Admin → Showcase),
 * with each slide's Buy Link surfaced as a "Shop the Gear" CTA. The DEMO reel
 * below is retained ONLY as a graceful fallback when the API returns nothing.
 */
const poster = (name) => `https://res.cloudinary.com/demo/video/upload/so_0/${name}.jpg`;
const clip = (name) => `https://res.cloudinary.com/demo/video/upload/${name}.mp4`;

const DEMO_VIDEOS = [
  {
    id: 'commute',
    tag: 'Everyday',
    title: 'The City Commute',
    description: 'Reliable gear that turns the daily grind into the best part of your day.',
    src: clip('dog'),
    poster: poster('dog'),
    buyLink: '/store',
    cta: 'Shop the Gear',
  },
  {
    id: 'escape',
    tag: 'Touring',
    title: 'Weekend Escape',
    description: 'Comfort and protection for the roads you chase when the week ends.',
    src: clip('elephants'),
    poster: poster('elephants'),
    buyLink: '/store',
    cta: 'Shop the Gear',
  },
  {
    id: 'coast',
    tag: 'Adventure',
    title: 'Coastal Miles',
    description: 'Kit built for the long way round, wherever the coast road leads.',
    src: clip('sea_turtle'),
    poster: poster('sea_turtle'),
    buyLink: '/store',
    cta: 'Shop the Gear',
  },
  {
    id: 'offgrid',
    tag: 'Trail',
    title: 'Off the Grid',
    description: 'Trail-ready protection for when the map runs out.',
    src: clip('outdoors'),
    poster: poster('outdoors'),
    buyLink: '/store',
    cta: 'Shop the Gear',
  },
];

export default function CinematicVideoShowcase() {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef(null);
  const [slides, setSlides] = useState(DEMO_VIDEOS);
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  // Fetch live slides; replace the demo reel only when the API returns some
  // (empty/error keeps the fallback in place — Deliverable 3).
  useEffect(() => {
    let alive = true;
    getShowcaseSlides().then((live) => {
      if (alive && live.length) {
        setSlides(live);
        setActive(0);
        setPlaying(false);
      }
    });
    return () => {
      alive = false;
    };
  }, []);

  const current = slides[active] ?? slides[0];
  const fade = reduceMotion ? 0 : 0.6; // background crossfade duration

  const play = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true; // set imperatively — React's `muted` attribute is unreliable
    // Flip to the playing state only once playback actually starts. With
    // preload="none" the first play() has to buffer first; hiding the chrome on
    // resolve (not optimistically) avoids a flash if the browser defers/blocks.
    el.play().then(() => setPlaying(true)).catch(() => {});
  };

  const stop = () => {
    const el = videoRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    setPlaying(false);
  };

  const selectSlide = (index) => {
    if (index === active) return;
    stop(); // reset any playback before swapping the source
    setActive(index);
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <section className={styles.theater} aria-label="Rider stories — cinematic theater">
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions -- click-to-pause is an enhancement; the Exit button is the accessible control */}
        <div className={styles.stage} onClick={playing ? stop : undefined}>
          {/* Base layer: the actual video. Poster-first — nothing streams until Play. */}
          <video
            ref={videoRef}
            className={styles.video}
            src={current.src}
            poster={current.poster}
            preload="none"
            playsInline
            muted
            onEnded={stop}
          />

          {/* Poster layer: framer crossfades between slides; CSS fades it out on Play to reveal the video. */}
          <div className={`${styles.posterLayer} ${playing ? styles.mediaHidden : ''}`} aria-hidden="true">
            <AnimatePresence initial={false}>
              <m.img
                key={current.id}
                src={current.poster}
                alt=""
                className={styles.poster}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: fade, ease: 'easeInOut' }}
              />
            </AnimatePresence>
          </div>

          {/* Chrome: gradient + center stage + filmstrip. CSS-fades out during playback. */}
          <div className={`${styles.chrome} ${playing ? styles.chromeHidden : ''}`}>
            <div className={styles.scrim} aria-hidden="true" />

            <div className={styles.center}>
              <AnimatePresence mode="wait">
                <m.div
                  key={current.id}
                  className={styles.centerText}
                  initial={{ opacity: 0, y: reduceMotion ? 0 : 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduceMotion ? 0 : -10 }}
                  transition={{ duration: reduceMotion ? 0 : 0.35 }}
                >
                  <p className={styles.eyebrow}>{current.tag}</p>
                  <h2 className={`display ${styles.title}`}>{current.title}</h2>
                  <p className={styles.desc}>{current.description}</p>
                </m.div>
              </AnimatePresence>

              <div className={styles.actions}>
                <button type="button" className={styles.playBtn} onClick={play}>
                  <Play size={20} strokeWidth={2} aria-hidden="true" className={styles.playIcon} />
                  Play Video
                </button>

                {current.buyLink &&
                  (current.buyLink.startsWith('/') ? (
                    <Link to={current.buyLink} className={styles.shopBtn}>
                      {current.cta}
                      <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                    </Link>
                  ) : (
                    <a
                      href={current.buyLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.shopBtn}
                    >
                      {current.cta}
                      <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
                    </a>
                  ))}
              </div>
            </div>

            <div className={styles.filmstrip} aria-label="More rider stories">
              {slides.map((v, i) =>
                i === active ? null : (
                  <m.button
                    key={v.id}
                    type="button"
                    className={styles.thumb}
                    onClick={() => selectSlide(i)}
                    aria-label={`Show ${v.title}`}
                    whileHover={reduceMotion ? undefined : { y: -4, scale: 1.03 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 22 }}
                  >
                    <img src={v.poster} alt="" className={styles.thumbImg} loading="lazy" />
                    <span className={styles.thumbScrim} aria-hidden="true" />
                    <span className={styles.thumbLabel}>{v.title}</span>
                  </m.button>
                ),
              )}
            </div>
          </div>

          {/* Exit control — only while playing. Restores the chrome. */}
          {playing && (
            <button
              type="button"
              className={styles.exitBtn}
              onClick={(e) => {
                e.stopPropagation();
                stop();
              }}
              aria-label="Exit video"
            >
              <X size={20} strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    </LazyMotion>
  );
}
