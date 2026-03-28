import { useEffect, useState, useRef } from "react";
import "./OfferBar.css";

import { API } from "@/config/api";

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
  const [offers, setOffers] = useState([]);
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);
  const [animate, setAnimate] = useState(true);

  const lastScroll = useRef(0);
  const timerRef = useRef(null);

  /* FETCH */
  useEffect(() => {
    fetch(`${API}/offers`)
      .then(r => r.json())
      .then(data => setOffers(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));
  }, []);

  /* AUTO-ROTATE */
  const startTimer = () => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setAnimate(false);
      setTimeout(() => {
        setIndex(prev => (prev + 1) % offers.length);
        setAnimate(true);
      }, 80);
    }, 4000);
  };

  useEffect(() => {
    if (offers.length > 1) startTimer();
    return () => clearInterval(timerRef.current);
  }, [offers]);

  /* SCROLL HIDE */
  useEffect(() => {
    const onScroll = () => {
      const cur = window.scrollY;
      setVisible(!(cur > lastScroll.current && cur > 60));
      lastScroll.current = cur;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const changeOffer = (dir) => {
    clearInterval(timerRef.current);
    setAnimate(false);
    setTimeout(() => {
      setIndex(prev => (prev + dir + offers.length) % offers.length);
      setAnimate(true);
    }, 80);
    if (offers.length > 1) startTimer();
  };

  if (!offers.length || !visible) return null;

  const current = offers[index];

  /* Extract optional tag prefix — admin can write "SALE: text" */
  const colonIdx = current.text?.indexOf(":");
  const hasTag = colonIdx > 0 && colonIdx < 10;
  const tag = hasTag ? current.text.slice(0, colonIdx).trim() : null;
  const bodyText = hasTag ? current.text.slice(colonIdx + 1).trim() : current.text;

  return (
    <div className={`offer-bar ${visible ? "offer-bar--show" : "offer-bar--hide"}`}>

      {/* LEFT ACCENT STRIP */}
      <div className="offer-strip" aria-hidden="true" />

      {/* PROGRESS BAR */}
      <div className="offer-progress" key={index} aria-hidden="true" />

      {/* INNER */}
      <div className="offer-inner">

        {/* LIVE DOT */}
        <span className="offer-live-dot" aria-hidden="true" />

        {/* LABEL */}
        <span className="offer-label">Offers</span>

        <span className="offer-sep" aria-hidden="true" />

        {/* PREV */}
        {offers.length > 1 && (
          <button className="offer-arrow" onClick={() => changeOffer(-1)}
            aria-label="Previous offer">
            <ChevronLeft />
          </button>
        )}

        {/* TEXT */}
        <div className="offer-text-wrap" aria-live="polite">
          <p className={`offer-text ${animate ? "offer-text--in" : "offer-text--out"}`}>
            {tag && <span className="offer-tag">{tag}</span>}
            {bodyText}
          </p>
        </div>

        {/* NEXT */}
        {offers.length > 1 && (
          <button className="offer-arrow" onClick={() => changeOffer(1)}
            aria-label="Next offer">
            <ChevronRight />
          </button>
        )}

        {/* DOTS */}
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

      {/* CLOSE */}
      <button className="offer-close" onClick={() => setVisible(false)}
        aria-label="Close offer bar">
        <CloseIcon />
      </button>

    </div>
  );
};

export default OfferBar;