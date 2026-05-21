import "./MaintenancePage.css";
import { useEffect, useState } from "react";

export default function MaintenancePage() {
  const targetDate = new Date("2026-05-22T12:00:00").getTime();

  const calculateTimeLeft = () => {
    const now = new Date().getTime();
    const difference = targetDate - now;

    if (difference <= 0) {
      return {
        days: "00",
        hours: "00",
        minutes: "00",
        seconds: "00",
      };
    }

    return {
      days: String(
        Math.floor(difference / (1000 * 60 * 60 * 24))
      ).padStart(2, "0"),

      hours: String(
        Math.floor((difference / (1000 * 60 * 60)) % 24)
      ).padStart(2, "0"),

      minutes: String(
        Math.floor((difference / 1000 / 60) % 60)
      ).padStart(2, "0"),

      seconds: String(
        Math.floor((difference / 1000) % 60)
      ).padStart(2, "0"),
    };
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

const handleWhatsApp = () => {
  window.open(
    "https://wa.me/918328031179?text=Hello%20MotoPark%20Team",
    "_blank"
  );
};

const handleEmail = () => {
  window.location.href =
    "mailto:support.motoparkvizag@gmail.com";
};

  return (
    <div className="mp-root">
      <div className="mp-overlay"></div>

      <div className="mp-card">
        <div className="mp-badge">
          <span className="mp-badge__dot"></span>
          Under Maintenance
        </div>

        <h1 className="mp-heading">
          We’ll Be <span>Back Soon</span>
        </h1>

        <p className="mp-sub">
          MotoPark is currently improving the experience for your next ride.
          We’re making things faster, smoother, and better.
        </p>

        <div className="mp-countdown">
          <div className="mp-cd-box">
            <span className="mp-cd-num">{timeLeft.days}</span>
            <span className="mp-cd-label">Days</span>
          </div>

          <div className="mp-cd-box">
            <span className="mp-cd-num">{timeLeft.hours}</span>
            <span className="mp-cd-label">Hours</span>
          </div>

          <div className="mp-cd-box">
            <span className="mp-cd-num">{timeLeft.minutes}</span>
            <span className="mp-cd-label">Minutes</span>
          </div>

          <div className="mp-cd-box">
            <span className="mp-cd-num">{timeLeft.seconds}</span>
            <span className="mp-cd-label">Seconds</span>
          </div>
        </div>

        <div className="mp-actions">
          <button className="mp-btn mp-btn--primary" onClick={handleEmail}>
            Email Us
          </button>

          <button className="mp-btn mp-btn--ghost" onClick={handleWhatsApp}>
            WhatsApp
          </button>
        </div>

        <div className="mp-footer">
          © 2026 MotoPark Vizag. All rights reserved.
        </div>
      </div>
    </div>
  );
}