import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, Volume2, VolumeX } from 'lucide-react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useScrollSequence } from '../engine/useScrollSequence.js';
import { overlayOpacity } from '../engine/cinematicUtils.js';
import { VIDEO_SRC, VIDEO_POSTER, MASK_TEXT, SCROLL_CONFIG, PHASES, MASK_SCALE } from './storyBandConfig.js';
import styles from './StoryBandCinematic.module.css';

const clamp01 = (n) => Math.min(1, Math.max(0, n));
const lerp = (a, b, t) => a + (b - a) * t;
/** Remaps progress `p` from [start, end] to [0, 1], clamped. */
const localT = (p, start, end) => clamp01((p - start) / (end - start));

/**
 * StoryBandCinematic — video text-mask reveal (docs/10 Amendment 2; Amendment
 * 3, 2026-07-23, changed how reduced-motion applies — see below). A bold
 * "MOTOPARK" wordmark is cut out of a navy scrim over a fullscreen looping
 * video, with the brand copy (eyebrow, headline, Rider Disciplines) laid
 * over it.
 *
 * Reached ONLY via a dynamic import() from StoryBand.jsx, same rule as every
 * other module in src/cinematic/ (docs/11 §7b). Never imported statically.
 *
 * ─── Two motion levels, one design (Amendment 3) ───────────────────────────
 *
 * Owner decision 2026-07-23: every desktop visitor sees this component —
 * `prefers-reduced-motion` no longer falls back to the old static StoryBand.
 * Instead `reducedMotion` (prop, from StoryBand.jsx) picks between two
 * presentations of the SAME elements:
 *
 *   - reducedMotion=false: scroll-scrubbed. CSS `position: sticky` keeps
 *     `.sticky` on screen for the height of `.track` (400vh) natively — no
 *     GSAP pin-spacer. `useScrollSequence` (`pin: false`) tracks progress
 *     across that range and drives the mask scale 1x→26x, the overlay fade,
 *     and the content reveal via `handleProgress`.
 *   - reducedMotion=true: no `.track`/sticky at all (no forced extra scroll
 *     distance — itself a motion-sensitivity concern, not just the zoom),
 *     no ScrollTrigger, no scale. `applyStaticPresentation` below sets the
 *     same elements to fixed, settled values once, imperatively — mask at
 *     rest (scale 1), a constant contrast scrim, and the brand copy simply
 *     present, matching this codebase's own established reduced-motion
 *     convention (Reveal.module.css: "the content is simply present, no
 *     transition, no transform, no delay").
 *
 * Both paths render the same video, the same MOTOPARK cutout, the same
 * copy, the same controls — never a different design, only different motion.
 *
 * ─── Two-phase render: probe, then active ──────────────────────────────────
 *
 * The <video> element is rendered on every render of this component — never
 * remounted — so the load probe and the active layout share the exact same
 * element and never trigger a second fetch or a playback restart. `active` is
 * a PROP owned by StoryBand.jsx, not local state: the load-gate effect below
 * calls `onReady()` directly from the video's native event handlers, so
 * "hide static fallback" and "show cinematic layer" land in the same React
 * commit — no blank frame, no double-content flash. See StoryBand.jsx.
 *
 * ─── Rendering model (direct DOM writes, no React state) ──────────────────
 *
 * Both `handleProgress` and `applyStaticPresentation` write transform/opacity
 * straight to refs rather than React state — mirrors AboutCinematic's ticker
 * convention so a 60fps scroll-scrub (or a one-time settle) never re-renders
 * React.
 *
 * ─── The mask trick ─────────────────────────────────────────────────────────
 *
 * The <video> itself is NEVER transformed — it always fills `.videoStage` at
 * its natural size, so it's never a zoomed-in, pixelated crop. Only the SVG
 * `<text>` INSIDE the mask definition is scaled (`transform-box: fill-box`
 * keeps the scale centred on the glyphs regardless of viewport size). A navy
 * `.overlay` sits above the video with that mask applied — white text areas
 * are cut out (video shows through), the black rect elsewhere stays opaque
 * navy. As the mask text grows, more of the screen falls "inside a stroke".
 * In the full-motion path, the overlay's own opacity (not just the mask)
 * fades to 0 near 85%–95% scroll, which is what actually delivers "clean
 * video, no lingering letter edges" — the letterforms are never relied on to
 * perfectly tile the viewport at 26x.
 */
export default function StoryBandCinematic({
  eyebrow,
  headline,
  lede,
  journeys,
  active,
  reducedMotion,
  onReady,
  onUnavailable,
}) {
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(true);

  const trackRef = useRef(null);
  const videoRef = useRef(null);
  const overlayRef = useRef(null);
  const maskTextRef = useRef(null);
  const contentRef = useRef(null);
  const disciplineRefs = useRef([]);

  // eslint-disable-next-line no-console -- TEMP DEBUG, remove after diagnosis
  console.log('[SCROLL-DEBUG] StoryBandCinematic render: active =', active, ' reducedMotion =', reducedMotion, ' -> useScrollSequence enabled =', active && !reducedMotion);

  // TEMP DEBUG — remove after diagnosis. Once, when active, dump the actual
  // measured geometry of the trigger/sticky elements so "is the track really
  // 400vh and is it really sticky" is a measured fact, not an assumption.
  useEffect(() => {
    if (!active) return;
    const el = trackRef.current;
    if (!el) return;
    const sticky = el.firstElementChild;
    // eslint-disable-next-line no-console -- TEMP DEBUG, remove after diagnosis
    console.log('[SCROLL-DEBUG] geometry check:', {
      trackTagName: el.tagName,
      trackClassName: el.className,
      trackOffsetHeight: el.offsetHeight,
      trackComputedHeight: getComputedStyle(el).height,
      stickyClassName: sticky?.className,
      stickyComputedPosition: sticky ? getComputedStyle(sticky).position : null,
      stickyOffsetHeight: sticky?.offsetHeight,
      viewportHeight: window.innerHeight,
    });
  }, [active]);

  // ── Force autoplay imperatively ────────────────────────────────────────────
  // The `autoPlay`/`muted` JSX attributes are not reliable on their own: React
  // can attach them a tick after the browser's autoplay-eligibility check has
  // already run, so the element sometimes sits paused at frame 0 with no
  // error. Verified in a real browser session (video reported
  // `paused: true, currentTime: 0` deep into the scroll, despite `autoPlay`
  // being set). Setting `.muted` and calling `.play()` imperatively removes
  // the race.
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = true;
    el.play().catch(() => {});
  }, []);

  // ── Load gate — tells the parent directly; no local state round trip ──────
  useEffect(() => {
    const el = videoRef.current;
    if (!el) return undefined;
    // videoWidth/videoHeight matter as much as readyState: a container can
    // parse cleanly (readyState reaches HAVE_ENOUGH_DATA, duration reads
    // correctly) via its audio track alone while the video track's codec has
    // no decoder available — no `error` event fires, but nothing ever
    // paints. Verified against a real HEVC asset: Chrome reported
    // readyState 4 with videoWidth/videoHeight stuck at 0. Both signals
    // together are what "the video actually works" means here.
    const isReady = () => el.readyState >= 2 && el.videoWidth > 0;
    if (isReady()) {
      onReady();
      return undefined;
    }
    const onLoaded = () => {
      if (isReady()) onReady();
      else onUnavailable();
    };
    const onError = () => onUnavailable();
    el.addEventListener('loadeddata', onLoaded);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('loadeddata', onLoaded);
      el.removeEventListener('error', onError);
    };
  }, [onReady, onUnavailable]);

  // ── Scroll-driven timeline — writes styles directly, no React state ───────
  const handleProgress = useCallback((p) => {
    const overlay = overlayRef.current;
    const maskText = maskTextRef.current;
    const content = contentRef.current;
    if (!overlay || !maskText || !content) return;

    const { revealEnd, fadeEnd, contentStart } = PHASES;

    // ── Mask: scales 1x → 26x across the reveal window, then holds ─────────
    const revealT = localT(p, 0, revealEnd);
    const scale = lerp(MASK_SCALE.from, MASK_SCALE.to, revealT);
    maskText.style.transform = `scale(${scale})`;
    // eslint-disable-next-line no-console -- TEMP DEBUG, remove after diagnosis
    console.log(`[SCROLL-DEBUG] handleProgress: p=${p.toFixed(4)} scale=${scale.toFixed(2)} scrollY=${window.scrollY}`);

    // ── Overlay: opaque navy (with the mask cutout) through the reveal, then
    //    fades away entirely so the finale is clean, unmasked video ────────
    const fadeT = localT(p, revealEnd, fadeEnd);
    overlay.style.opacity = String(lerp(0.92, 0, fadeT));
    overlay.style.maskImage = fadeT < 1 ? 'url(#storyTextMask)' : 'none';
    overlay.style.webkitMaskImage = overlay.style.maskImage;

    // ── Brand story copy fades in once the video reads as clean ────────────
    const contentT = localT(p, contentStart, 1);
    content.style.opacity = String(contentT);
    content.style.transform = `translateY(${(1 - contentT) * 20}px)`;

    // ── Rider Disciplines: staggered within the same closing window ────────
    const stagger = 0.02;
    disciplineRefs.current.forEach((el, i) => {
      if (!el) return;
      const start = contentStart + 0.03 + i * stagger;
      const peak = Math.min(start + 0.03, 1);
      const end = Math.min(start + 0.06, 1);
      const o = overlayOpacity(p, start, peak, end);
      el.style.opacity = String(o);
      el.style.transform = `translateY(${(1 - o) * 12}px)`;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refs are stable; no reactive deps needed
  }, []);

  // Never registers a ScrollTrigger when reducedMotion — no scroll listener,
  // no pin/sticky-distance math, nothing scroll-jacked for these users.
  useScrollSequence({
    triggerRef: trackRef,
    onProgress: handleProgress,
    ...SCROLL_CONFIG,
    enabled: active && !reducedMotion,
  });

  // ── Reduced-motion presentation — same elements, settled once, no scroll
  //    tie-in. Mirrors handleProgress's END state (scale 1 instead of 26,
  //    since there's no zoom to land after; a constant scrim rather than a
  //    scroll-driven fade; content simply present) rather than introducing a
  //    third, different-looking design. Re-runs if reducedMotion flips mid-
  //    session (OS setting toggled) so an in-progress scroll-scrubbed state
  //    snaps to the settled one immediately. ─────────────────────────────
  useEffect(() => {
    if (!active || !reducedMotion) return;
    const overlay = overlayRef.current;
    const maskText = maskTextRef.current;
    const content = contentRef.current;
    if (!overlay || !maskText || !content) return;

    maskText.style.transform = 'scale(1)';
    overlay.style.opacity = '0.7';
    overlay.style.maskImage = 'url(#storyTextMask)';
    overlay.style.webkitMaskImage = 'url(#storyTextMask)';
    content.style.opacity = '1';
    content.style.transform = 'none';
    disciplineRefs.current.forEach((el) => {
      if (!el) return;
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
  }, [active, reducedMotion]);

  // ── content-visibility safeguard ────────────────────────────────────────
  // StoryBand is wrapped by <Reveal> in HomePage.jsx, whose .skipOffscreen
  // applies `content-visibility: auto`. Until that ancestor lays this subtree
  // out for real (it un-skips once the section nears the viewport), .track
  // may not have been measured at its true 400vh height yet — a
  // ResizeObserver on our own trigger element catches the moment that
  // happens and re-runs ScrollTrigger.refresh() so the scroll range reflects
  // actual page geometry. Not relevant when reducedMotion (no ScrollTrigger
  // exists to refresh).
  useEffect(() => {
    if (!active || reducedMotion) return undefined;
    const el = trackRef.current;
    if (!el) return undefined;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [active, reducedMotion]);

  const togglePlay = () => {
    const el = videoRef.current;
    if (!el) return;
    if (playing) el.pause();
    else el.play().catch(() => {});
    setPlaying(!playing);
  };

  const toggleMute = () => {
    const el = videoRef.current;
    if (!el) return;
    el.muted = !muted;
    setMuted(!muted);
  };

  const trackClass = active ? (reducedMotion ? styles.trackStatic : styles.track) : undefined;
  const stickyClass = active ? (reducedMotion ? styles.stickyStatic : styles.sticky) : undefined;

  return (
    <div ref={trackRef} className={trackClass}>
      <div className={stickyClass}>
        <div className={styles.videoStage} aria-hidden="true">
          <video
            ref={videoRef}
            className={styles.video}
            src={VIDEO_SRC}
            poster={VIDEO_POSTER}
            preload="auto"
            autoPlay
            loop
            muted
            playsInline
            style={active ? undefined : { display: 'none' }}
          />
        </div>

        {active && (
          <>
            {/* Decorative duplicate of StoryBand.jsx's static content — always
                aria-hidden. The static block is the accessible source of truth
                (see StoryBand.jsx); this is a visual-only re-presentation. */}
            <div aria-hidden="true">
              <div ref={overlayRef} className={styles.overlay} />

              <svg className={styles.maskSvg} aria-hidden="true">
                <mask id="storyTextMask">
                  <rect width="100%" height="100%" fill="white" />
                  <text
                    ref={maskTextRef}
                    x="50%"
                    // Full motion: dead-centre — the wordmark is gone (mask
                    // removed, overlay faded) long before .content appears,
                    // so there's nothing to collide with. Reduced motion:
                    // both are visible at once with nothing to sequence
                    // them, so the wordmark moves up and .contentStatic
                    // (below) pins the copy to the bottom third instead.
                    y={reducedMotion ? '30%' : '50%'}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className={styles.maskText}
                  >
                    {MASK_TEXT}
                  </text>
                </mask>
              </svg>

              <div ref={contentRef} className={`${styles.content} ${reducedMotion ? styles.contentStatic : ''}`}>
                <p className={styles.eyebrow}>{eyebrow}</p>
                <h2 className={styles.headline}>{headline}</h2>
                <p className={styles.lede}>{lede}</p>

                <div className={styles.disciplines}>
                  {journeys.map((j, i) => (
                    <div
                      key={j.id}
                      ref={(el) => {
                        disciplineRefs.current[i] = el;
                      }}
                      className={styles.disciplineItem}
                    >
                      <span className={styles.disciplineNumber}>{j.num}</span>
                      <span className={styles.disciplineTagline}>{j.tagline}</span>
                      <h3 className={styles.disciplineTitle}>{j.title}</h3>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Real, unique controls — NOT decorative, NOT aria-hidden. The
                static fallback has no video to control, so these only exist
                here and must stay reachable by keyboard/AT. */}
            <div className={styles.controls}>
              <button type="button" className={styles.controlBtn} onClick={togglePlay} aria-label={playing ? 'Pause video' : 'Play video'}>
                {playing ? <Pause size={16} strokeWidth={2} /> : <Play size={16} strokeWidth={2} />}
              </button>
              <button type="button" className={styles.controlBtn} onClick={toggleMute} aria-label={muted ? 'Unmute video' : 'Mute video'}>
                {muted ? <VolumeX size={16} strokeWidth={2} /> : <Volume2 size={16} strokeWidth={2} />}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
