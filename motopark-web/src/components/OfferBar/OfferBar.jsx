/**
 * src/components/OfferBar/OfferBar.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Raw fetch → cachedFetch
 *      Before: bare fetch with no cache. OfferBar mounts on every
 *      non-admin page. If the Home page also has an offers section
 *      that fetches /api/offers separately, that's 2+ requests per
 *      page load. With StrictMode: 4+ requests.
 *      After: all components share one cached response for 5 min.
 *
 * [F2] AbortController + isMounted guard
 *      Before: no cleanup on unmount → memory leak + React warning.
 *      After: ctrl.abort() + alive flag.
 *
 * [F3] startTimer useCallback dependency fix
 *      Before: startTimer was declared as a plain function inside
 *      the component but used in multiple useEffect hooks. This
 *      caused the timer to reference stale closure values of offers.length.
 *      After: startTimer is memoized with useCallback, offers.length
 *      is in deps so the timer always sees current length.
 *
 * [F4] Timer cleanup on changeOffer
 *      Before: clearInterval called but startTimer NOT restarted if
 *      offers.length was 1 (guard was missing). Could leave the interval
 *      dead after manual navigation.
 *      After: explicit guard — only restarts if offers.length > 1.
 */

import { useEffect, useState, useRef, useCallback } from "react";
import "./OfferBar.css";

import { API } from "@/config/api";
import { cachedFetch } from "@/lib/apiCache"; // [F1]

const ChevronLeft = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M6.5 2L3.5 5L6.5 8" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronRight = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M3.5 2L6.5 5L3.5 8" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CloseIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
    <path d="M2 2l6 6M8 2l-6 6" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" />
  </svg>
);

const OfferBar = () => {
  const [offers,  setOffers]  = useState([]);
  const [index,   setIndex]   = useState(0);
  const [visible, setVisible] = useState(true);
  const [animate, setAnimate] = useState(true);

  const lastScroll = useRef(0);
  const timerRef   = useRef(null);
  const offersRef  = useRef(offers); // stable ref for interval callback

  // Keep ref in sync — interval reads offersRef so it never has stale closure
  offersRef.current = offers;

  // [F1] + [F2]: cachedFetch with abort + alive guard
  useEffect(() => {
    const ctrl  = new AbortController();
    let   alive = true;

    cachedFetch(`${API}/offers`, { signal: ctrl.signal })
      .then((data) => { if (alive) setOffers(Array.isArray(data) ? data : []); })
      .catch((err)  => { if (err.name !== "AbortError") console.error("[OfferBar]", err); });

    return () => { alive = false; ctrl.abort(); };
  }, []);

  // [F3]: stable startTimer — always sees current offers.length via offersRef
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setAnimate(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % offersRef.current.length);
        setAnimate(true);
      }, 80);
    }, 4000);
  }, []); // no deps needed — reads via ref

  useEffect(() => {
    if (offers.length > 1) startTimer();
    return () => clearInterval(timerRef.current);
  }, [offers, startTimer]);

  /* Scroll hide */
  useEffect(() => {
    const onScroll = () => {
      const cur = window.scrollY;
      setVisible(!(cur > lastScroll.current && cur > 60));
      lastScroll.current = cur;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // [F4]: always reset timer correctly after manual nav
  const changeOffer = useCallback((dir) => {
    clearInterval(timerRef.current);
    setAnimate(false);
    setTimeout(() => {
      setIndex(prev => (prev + dir + offersRef.current.length) % offersRef.current.length);
      setAnimate(true);
    }, 80);
    if (offersRef.current.length > 1) startTimer();
  }, [startTimer]);

  if (!offers.length || !visible) return null;

  const current   = offers[index];
  const colonIdx  = current.text?.indexOf(":");
  const hasTag    = colonIdx > 0 && colonIdx < 10;
  const tag       = hasTag ? current.text.slice(0, colonIdx).trim() : null;
  const bodyText  = hasTag ? current.text.slice(colonIdx + 1).trim() : current.text;

  return (
    <div className={`offer-bar ${visible ? "offer-bar--show" : "offer-bar--hide"}`}>

      <div className="offer-strip" aria-hidden="true" />
      <div className="offer-progress" key={index} aria-hidden="true" />

      <div className="offer-inner">
        <span className="offer-live-dot" aria-hidden="true" />
        <span className="offer-label">Offers</span>
        <span className="offer-sep" aria-hidden="true" />

        {offers.length > 1 && (
          <button className="offer-arrow" onClick={() => changeOffer(-1)}
            aria-label="Previous offer">
            <ChevronLeft />
          </button>
        )}

        <div className="offer-text-wrap" aria-live="polite">
          <p className={`offer-text ${animate ? "offer-text--in" : "offer-text--out"}`}>
            {tag && <span className="offer-tag">{tag}</span>}
            {bodyText}
          </p>
        </div>

        {offers.length > 1 && (
          <button className="offer-arrow" onClick={() => changeOffer(1)}
            aria-label="Next offer">
            <ChevronRight />
          </button>
        )}

        {offers.length > 1 && (
          <div className="offer-dots" role="tablist" aria-label="Offers">
            {offers.map((_, i) => (
              <button
                key={i}
                role="tab"
                aria-selected={i === index}
                aria-label={`Offer ${i + 1}`}
                className={`offer-dot ${i === index ? "offer-dot--active" : ""}`}
                onClick={() => {
                  clearInterval(timerRef.current);
                  setAnimate(false);
                  setTimeout(() => { setIndex(i); setAnimate(true); }, 80);
                  startTimer();
                }}
              />
            ))}
          </div>
        )}
      </div>

      <button className="offer-close" onClick={() => setVisible(false)}
        aria-label="Close offer bar">
        <CloseIcon />
      </button>
    </div>
  );
};

export default OfferBar;