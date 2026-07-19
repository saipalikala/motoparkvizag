import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, domAnimation, LazyMotion, m, useReducedMotion } from 'framer-motion';
import { ArrowRight, Play, X } from 'lucide-react';
import { getShowcaseSlides } from '@/services/videoShowcase.js';
import { cloudinaryUrl } from '@/lib/image.js';
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
 * with each slide's Buy Link surfaced as a "Shop the Gear" CTA.
 *
 * There is deliberately NO hardcoded fallback reel. This used to seed state with
 * a demo reel built on Cloudinary's public sample assets, which had two costs:
 * 212 kB of stock images downloaded on every single page view and then discarded
 * the moment the API answered, and the risk that a motorcycle storefront would
 * display Cloudinary's stock sea turtle and elephants if the API ever returned
 * empty. Nothing renders now until the fetch settles, and an empty result hides
 * the section rather than inventing content.
 */
export default function CinematicVideoShowcase() {
  const reduceMotion = useReducedMotion();
  const videoRef = useRef(null);
  const [slides, setSlides] = useState(null); // null = still resolving
  const [active, setActive] = useState(0);
  const [playing, setPlaying] = useState(false);

  // An empty array is a resolved "nothing to show", distinct from null. Errors
  // resolve the same way: no slides beats stock footage.
  useEffect(() => {
    let alive = true;
    getShowcaseSlides()
      .then((live) => {
        if (alive) setSlides(Array.isArray(live) ? live : []);
      })
      .catch(() => {
        if (alive) setSlides([]);
      });
    return () => {
      alive = false;
    };
  }, []);

  /* Placed after every hook so the hook order never varies.
   *
   * While resolving, render the section's shell and nothing else. This is what
   * keeps CLS at zero: .theater is a fixed 85vh, so the box is identical before
   * and after the slides arrive — content fills in without moving anything. The
   * naive version of this fix (render nothing until data lands) would insert
   * 85vh into the page mid-load and shift everything below it. */
  if (slides === null) {
    return <section className={styles.theater} aria-busy="true" aria-label="Loading rider stories" />;
  }

  /* Resolved but empty: drop the section. This collapses 85vh, which can shift
   * content below — accepted deliberately, because it only happens when the API
   * returns nothing or fails, and the alternative is a permanent 85vh of blank
   * navy on the homepage. */
  if (slides.length === 0) return null;

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
          {/* No `poster` attribute on purpose. .posterLayer below is absolutely
              positioned over this video and only hides once playback starts, so
              the video's own poster is never visible — but the browser still
              downloaded it, at the full untransformed size, because a poster
              attribute cannot be lazy-loaded or run through cloudinaryUrl.
              Measured on staging: a redundant 254.8 kB raw fetch on every load,
              alongside the transformed copy the poster layer was already using. */}
          <video
            ref={videoRef}
            className={styles.video}
            src={current.src}
            preload="none"
            playsInline
            muted
            onEnded={stop}
          />

          {/* Poster layer: framer crossfades between slides; CSS fades it out on Play to reveal the video. */}
          <div className={`${styles.posterLayer} ${playing ? styles.mediaHidden : ''}`} aria-hidden="true">
            <AnimatePresence initial={false}>
              {/* Posters were served RAW — no transform at all. Measured on
                  staging: three 1448px originals at 255/248/202 kB, 705 kB for
                  one section, two of them displayed at 166px wide. The helper
                  the rest of the app already uses gives f_auto,q_auto and a real
                  width. `loading="lazy"` matters as much: this section sits
                  below the fold, and without it the DEMO fallback posters
                  download immediately and are then thrown away the moment the
                  API returns live slides. */}
              <m.img
                key={current.id}
                src={cloudinaryUrl(current.poster, { w: 1440 })}
                alt=""
                loading="lazy"
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
                    {/* Rendered at ~166px; was downloading the 1448px original. */}
                    <img src={cloudinaryUrl(v.poster, { w: 360 })} alt="" className={styles.thumbImg} loading="lazy" />
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
