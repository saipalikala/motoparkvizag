import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { API } from "@/config/api";
import "./AuthPage.css";

/* ─── ICONS ─── */
const MailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const LockIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
);

const PhoneIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.65 3.39 2 2 0 0 1 3.62 1h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.5a16 16 0 0 0 6 6l.92-.92a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
);

const ArrowRightIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="5" y1="12" x2="19" y2="12" />
        <polyline points="12 5 19 12 12 19" />
    </svg>
);

/* ─── LOGO (matches reference circular badge) ─── */
const MotoParkLogo = () => (
    <div className="mp-logo-wrap">
        <div className="mp-logo-circle">
            <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                {/* sunset gradient layers */}
                <circle cx="28" cy="28" r="28" fill="#0b1d3a" />
                <ellipse cx="28" cy="34" rx="20" ry="12" fill="#1a2e4a" />
                {/* sun */}
                <circle cx="28" cy="26" r="9" fill="#ff6b3d" />
                <path d="M10 34 Q28 18 46 34" fill="#ff8c42" opacity="0.6" />
                {/* trees silhouette */}
                <path d="M8 42 L12 30 L16 42Z" fill="#0b1d3a" />
                <path d="M40 42 L44 30 L48 42Z" fill="#0b1d3a" />
                <path d="M14 42 L18 33 L22 42Z" fill="#0b1d3a" />
                <path d="M34 42 L38 33 L42 42Z" fill="#0b1d3a" />
                {/* rider silhouette */}
                <ellipse cx="28" cy="23" rx="2.5" ry="3" fill="#0b1d3a" />
                <path d="M24 28 Q28 24 32 28" stroke="#0b1d3a" strokeWidth="2" fill="none" strokeLinecap="round" />
            </svg>
        </div>
        <p className="mp-logo-name">MOTO PARK</p>
        <p className="mp-logo-estd">— ESTD 2020 —</p>
    </div>
);

/* ════════════════════════════════
   MAIN AUTH PAGE
════════════════════════════════ */
const AuthPage = () => {
    const navigate = useNavigate();
    const { login: setAuth } = useUser();

    const [email, setEmail] = useState("");
    const [otp, setOtp] = useState("");
    const [otpSent, setOtpSent] = useState(false);
    const [sendingOtp, setSendingOtp] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [timer, setTimer] = useState(0);

    const startTimer = () => {
        setTimer(60);
        const iv = setInterval(() => setTimer(t => {
            if (t <= 1) { clearInterval(iv); return 0; }
            return t - 1;
        }), 1000);
    };

    const handleSendOtp = async () => {
        if (!email.includes("@")) { setError("Enter a valid email address"); return; }
        setSendingOtp(true); setError("");
        try {
            const res = await fetch(`${API}/users/otp/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.toLowerCase() }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Failed to send OTP"); return; }
            setOtpSent(true);
            startTimer();
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setSendingOtp(false);
        }
    };

    const handleContinue = async () => {
        if (!email.includes("@")) { setError("Enter a valid email address"); return; }
        if (!otp || otp.length < 4) { setError("Enter the OTP sent to your email"); return; }
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API}/users/otp/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.toLowerCase(), otp }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Invalid code"); return; }
            setAuth(data.user, data.token);
            const redirect = sessionStorage.getItem("authRedirect") || "/";
            sessionStorage.removeItem("authRedirect");
            navigate(redirect);
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg" aria-hidden="true" />

            <div className="auth-card">
                {/* LOGO */}
                <MotoParkLogo />

                {/* HEADER */}
                <div className="auth-header">
                    <h1 className="auth-title">Welcome back</h1>
                    <p className="auth-subtitle">Sign in to continue your journey</p>
                </div>

                {/* ERROR */}
                {error && <div className="auth-error">{error}</div>}

                {/* EMAIL FIELD */}
                <div className="auth-field">
                    <span className="auth-field-icon"><MailIcon /></span>
                    <input
                        type="email"
                        className="auth-input"
                        placeholder="Email address"
                        value={email}
                        onChange={e => { setEmail(e.target.value); setError(""); }}
                        autoFocus
                    />
                </div>

                {/* OTP FIELD */}
                <div className="auth-field auth-field--otp">
                    <span className="auth-field-icon"><LockIcon /></span>
                    <input
                        type="tel"
                        className="auth-input"
                        placeholder="Enter OTP"
                        value={otp}
                        maxLength={6}
                        onChange={e => { setOtp(e.target.value.replace(/\D/g, "").slice(0, 6)); setError(""); }}
                    />
                    <div className="auth-otp-divider" />
                    <button
                        type="button"
                        className="auth-send-otp-btn"
                        onClick={handleSendOtp}
                        disabled={sendingOtp || timer > 0}>
                        {sendingOtp ? "Sending…" : timer > 0 ? `${timer}s` : "Send OTP"}
                    </button>
                </div>

                {/* PRIMARY CTA */}
                <button
                    type="button"
                    className={`auth-cta-btn ${loading ? "auth-cta-btn--loading" : ""}`}
                    onClick={handleContinue}
                    disabled={loading}>
                    {loading
                        ? <span className="auth-spinner" />
                        : <>
                            <span>Continue</span>
                            <ArrowRightIcon />
                        </>
                    }
                </button>

                {/* DIVIDER */}
                <div className="auth-divider">
                    <span className="auth-divider-line" />
                    <span className="auth-divider-text">OR</span>
                    <span className="auth-divider-line" />
                </div>

                {/* SECONDARY BUTTON */}
                <button type="button" className="auth-secondary-btn">
                    <PhoneIcon />
                    <span>Continue with Mobile</span>
                </button>

                {/* FOOTER */}
                <p className="auth-footer">
                    By continuing, you agree to our{" "}
                    <a href="#" className="auth-link">Terms &amp; Privacy Policy</a>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;