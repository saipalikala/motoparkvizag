/**
 * src/pages/Maintenance/MaintenancePage.jsx
 *
 * HOW TO USE:
 * ─────────────────────────────────────────────────────────────
 * 1. Set VITE_MAINTENANCE_MODE=true in your .env file
 * 2. In App.jsx, add these 3 lines at the top of App():
 *
 *      const MAINTENANCE = import.meta.env.VITE_MAINTENANCE_MODE === "true";
 *      if (MAINTENANCE) return <MaintenancePage />;
 *
 * 3. Import at the top of App.jsx:
 *      import MaintenancePage from "@/pages/Maintenance/MaintenancePage";
 *
 * 4. To go live again: set VITE_MAINTENANCE_MODE=false (or delete it)
 *    and redeploy. Zero code changes needed.
 *
 * CUSTOMISE:
 * - RETURN_HOURS: how many hours until you're back
 * - WHATSAPP_NUMBER: your WhatsApp number with country code (no +)
 * - SUPPORT_EMAIL: your support email
 * - PROGRESS: 0–100, how much work is done
 * ─────────────────────────────────────────────────────────────
 */

import { useEffect, useState, useCallback } from "react";
import "./MaintenancePage.css";

const RETURN_HOURS     = 4;          // ← change this
const WHATSAPP_NUMBER  = "917989XXXXXX"; // ← your number
const SUPPORT_EMAIL    = "support@motoparkvizag.in";
const PROGRESS         = 68;         // ← 0–100

// Target = now + RETURN_HOURS hours. In production you could
// replace this with a fixed ISO string: new Date("2025-07-01T10:00:00+05:30")
const TARGET_TIME = new Date(Date.now() + RETURN_HOURS * 60 * 60 * 1000);

function pad(n) {
  return String(Math.max(0, n)).padStart(2, "0");
}

function getTimeLeft() {
  const diff = Math.max(0, TARGET_TIME - Date.now());
  return {
    h: pad(Math.floor(diff / 3_600_000)),
    m: pad(Math.floor((diff % 3_600_000) / 60_000)),
    s: pad(Math.floor((diff % 60_000) / 1_000)),
    done: diff === 0,
  };
}

export default function MaintenancePage() {
  const [time, setTime] = useState(getTimeLeft);
  const [gearDeg, setGearDeg] = useState(0);

  // Countdown tick
  useEffect(() => {
    const id = setInterval(() => {
      const t = getTimeLeft();
      setTime(t);
      if (t.done) clearInterval(id);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Gear spin via JS (avoids CSS animation jank on low-end devices)
  useEffect(() => {
    let raf;
    let last = performance.now();
    const step = (now) => {
      const delta = now - last;
      last = now;
      setGearDeg((d) => (d + delta * 0.025) % 360);
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  const handleEmail = useCallback(() => {
    window.location.href = `mailto:${SUPPORT_EMAIL}?subject=Site%20Enquiry%20During%20Maintenance`;
  }, []);

  const handleWhatsApp = useCallback(() => {
    window.open(`https://wa.me/${WHATSAPP_NUMBER}`, "_blank", "noopener");
  }, []);

  return (
    <div className="mp-root" role="main" aria-label="Site under maintenance">
      {/* Ambient blobs — CSS only, no JS */}
      <div className="mp-blob mp-blob--tl" aria-hidden="true" />
      <div className="mp-blob mp-blob--br" aria-hidden="true" />

      {/* Logo */}
      <header className="mp-logo">
        <span className="mp-logo__icon" aria-hidden="true">🏍</span>
        <div>
          <p className="mp-logo__name">MotoPark Vizag</p>
          <p className="mp-logo__tagline">Premium Motorcycle Gear</p>
        </div>
      </header>

      {/* Animated gear */}
      <div
        className="mp-gear"
        aria-hidden="true"
        style={{ transform: `rotate(${gearDeg}deg)` }}
      >
        ⚙
      </div>

      {/* Status badge */}
      <div className="mp-badge" role="status">
        <span className="mp-badge__dot" />
        Under Maintenance
      </div>

      {/* Heading */}
      <h1 className="mp-heading">
        We're fine-tuning<br />our <span>ride</span> for you.
      </h1>

      <p className="mp-sub">
        Sorry for the inconvenience — our team is hard at work bringing you a
        faster, smoother experience. We'll be back shortly. Thank you for your
        patience! 🙏
      </p>

      {/* Countdown */}
      <div className="mp-countdown" aria-label="Time remaining">
        <div className="mp-cd-box">
          <span className="mp-cd-num" aria-label={`${time.h} hours`}>{time.h}</span>
          <span className="mp-cd-label">Hours</span>
        </div>
        <span className="mp-cd-sep" aria-hidden="true">:</span>
        <div className="mp-cd-box">
          <span className="mp-cd-num" aria-label={`${time.m} minutes`}>{time.m}</span>
          <span className="mp-cd-label">Mins</span>
        </div>
        <span className="mp-cd-sep" aria-hidden="true">:</span>
        <div className="mp-cd-box">
          <span className="mp-cd-num" aria-label={`${time.s} seconds`}>{time.s}</span>
          <span className="mp-cd-label">Secs</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="mp-progress" aria-label={`Work ${PROGRESS}% complete`}>
        <div className="mp-progress__labels">
          <span>Work in progress</span>
          <span>{PROGRESS}%</span>
        </div>
        <div className="mp-progress__track" role="progressbar" aria-valuenow={PROGRESS} aria-valuemin={0} aria-valuemax={100}>
          <div className="mp-progress__fill" style={{ width: `${PROGRESS}%` }} />
        </div>
      </div>

      {/* CTA buttons */}
      <div className="mp-actions">
        <button className="mp-btn mp-btn--primary" onClick={handleEmail}>
          ✉ &nbsp;Email Us
        </button>
        <button className="mp-btn mp-btn--ghost" onClick={handleWhatsApp}>
          💬 &nbsp;WhatsApp
        </button>
      </div>

      <footer className="mp-footer">
        © {new Date().getFullYear()} MotoPark Vizag · All rights reserved
      </footer>
    </div>
  );
}