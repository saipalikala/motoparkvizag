import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import { API } from "@/config/api";
import "./AuthPage.css";

/* ─── LOGO ─── */
const MotoParkLogo = () => (
    <svg width="36" height="36" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#ff6b3d" />
        <path d="M8 20 C8 20 10 12 16 12 C22 12 24 20 24 20"
            stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="11" cy="20" r="3" stroke="white" strokeWidth="2" fill="none" />
        <circle cx="21" cy="20" r="3" stroke="white" strokeWidth="2" fill="none" />
    </svg>
);

const EmailIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
        <polyline points="22,6 12,13 2,6" />
    </svg>
);

const ShieldIcon = () => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const ArrowLeft = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="19" y1="12" x2="5" y2="12" />
        <polyline points="12 19 5 12 12 5" />
    </svg>
);

/* ════════════════════════════════
   STEP 1 — Enter Email
════════════════════════════════ */
const StepEmail = ({ onSent }) => {
    const [email, setEmail] = useState("");
    const [loading, setLoad] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        if (!email.includes("@")) { setError("Enter a valid email address"); return; }
        setLoad(true); setError("");
        try {
            const res = await fetch(`${API}/api/users/otp/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.toLowerCase() }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Failed to send OTP"); return; }
            onSent(email.toLowerCase());
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setLoad(false);
        }
    };

    return (
        <form className="auth-form" onSubmit={submit}>
            <div className="auth-step-icon auth-step-icon--email">
                <EmailIcon />
            </div>
            <h2 className="auth-step-title">Enter your email</h2>
            <p className="auth-step-sub">
                We'll send a 6-digit code to sign you in.
                No password needed.
            </p>

            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
                <input
                    type="email"
                    className="auth-input"
                    placeholder="you@example.com"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setError(""); }}
                    autoFocus
                    required
                />
            </div>

            <button
                type="submit"
                className={`auth-submit-btn ${loading ? "auth-submit-btn--loading" : ""}`}
                disabled={loading}>
                {loading ? <span className="auth-spinner" /> : "Send Code"}
            </button>

            <p className="auth-note">
                New here? We'll create your account automatically.
            </p>
        </form>
    );
};

/* ════════════════════════════════
   STEP 2 — Enter OTP
════════════════════════════════ */
const StepOtp = ({ email, onSuccess, onBack }) => {
    const [otp, setOtp] = useState("");
    const [loading, setLoad] = useState(false);
    const [resending, setResend] = useState(false);
    const [error, setError] = useState("");
    const [timer, setTimer] = useState(60);
    const [sent, setSent] = useState(true);

    /* countdown */
    useState(() => {
        const iv = setInterval(() => setTimer(t => {
            if (t <= 1) { clearInterval(iv); return 0; }
            return t - 1;
        }), 1000);
        return () => clearInterval(iv);
    });

    const verify = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError("Enter the 6-digit code"); return; }
        setLoad(true); setError("");
        try {
            const res = await fetch(`${API}/api/users/otp/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, otp }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message || "Invalid code"); return; }
            onSuccess(data.user, data.token);
        } catch {
            setError("Connection error. Please try again.");
        } finally {
            setLoad(false);
        }
    };

    const resend = async () => {
        setResend(true); setError(""); setOtp("");
        try {
            await fetch(`${API}/api/users/otp/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });
            setTimer(60);
            setSent(true);
            const iv = setInterval(() => setTimer(t => {
                if (t <= 1) { clearInterval(iv); return 0; }
                return t - 1;
            }), 1000);
        } catch {
            setError("Could not resend. Try again.");
        } finally {
            setResend(false);
        }
    };

    /* auto-submit when 6 digits entered */
    const handleOtpChange = (val) => {
        const clean = val.replace(/\D/g, "").slice(0, 6);
        setOtp(clean);
        setError("");
    };

    return (
        <form className="auth-form" onSubmit={verify}>
            <div className="auth-step-icon auth-step-icon--otp">
                <ShieldIcon />
            </div>
            <h2 className="auth-step-title">Check your email</h2>
            <p className="auth-step-sub">
                We sent a 6-digit code to<br />
                <strong>{email}</strong>
            </p>

            {error && <div className="auth-error">{error}</div>}

            <div className="auth-field">
                <input
                    className="auth-input auth-input--otp"
                    type="tel"
                    placeholder="000000"
                    value={otp}
                    maxLength={6}
                    onChange={e => handleOtpChange(e.target.value)}
                    autoFocus
                />
            </div>

            <button
                type="submit"
                className={`auth-submit-btn ${loading ? "auth-submit-btn--loading" : ""}`}
                disabled={loading || otp.length !== 6}>
                {loading ? <span className="auth-spinner" /> : "Verify & Sign In"}
            </button>

            <div className="auth-resend-row">
                {timer > 0 ? (
                    <span className="auth-timer">Resend code in {timer}s</span>
                ) : (
                    <button type="button" className="auth-resend-btn"
                        onClick={resend} disabled={resending}>
                        {resending ? "Sending…" : "Resend code"}
                    </button>
                )}
            </div>

            <button type="button" className="auth-back-btn" onClick={onBack}>
                <ArrowLeft /> Use a different email
            </button>
        </form>
    );
};

/* ════════════════════════════════
   MAIN AUTH PAGE
════════════════════════════════ */
const AuthPage = () => {
    const navigate = useNavigate();
    const { login: setAuth } = useUser();

    const [step, setStep] = useState("email"); // "email" | "otp"
    const [email, setEmail] = useState("");

    const handleSent = (sentEmail) => {
        setEmail(sentEmail);
        setStep("otp");
    };

    const handleSuccess = (user, token) => {
        setAuth(user, token);
        const redirect = sessionStorage.getItem("authRedirect") || "/";
        sessionStorage.removeItem("authRedirect");
        navigate(redirect);
    };

    return (
        <div className="auth-page">
            <div className="auth-bg" aria-hidden="true" />

            <div className="auth-card">
                {/* LOGO */}
                <div className="auth-logo">
                    <MotoParkLogo />
                    <div>
                        <span className="auth-logo-name">MotoPark</span>
                        <span className="auth-logo-sub">Vizag</span>
                    </div>
                </div>

                {/* PROGRESS DOTS */}
                <div className="auth-progress">
                    <div className={`auth-dot ${step === "email" ? "auth-dot--active" : "auth-dot--done"}`} />
                    <div className="auth-progress-line" />
                    <div className={`auth-dot ${step === "otp" ? "auth-dot--active" : step === "email" ? "" : "auth-dot--done"}`} />
                </div>

                {/* STEPS */}
                {step === "email" && (
                    <StepEmail onSent={handleSent} />
                )}
                {step === "otp" && (
                    <StepOtp
                        email={email}
                        onSuccess={handleSuccess}
                        onBack={() => setStep("email")}
                    />
                )}
            </div>
        </div>
    );
};

export default AuthPage;