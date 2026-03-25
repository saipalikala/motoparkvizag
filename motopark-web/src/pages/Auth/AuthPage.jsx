import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useUser } from "@/context/UserContext";
import "./AuthPage.css";

const API = "http://localhost:5000";

/* ─── ICONS ─── */
const MotoParkLogo = () => (
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#ff6b3d" />
        <path d="M8 20 C8 20 10 12 16 12 C22 12 24 20 24 20" stroke="white" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <circle cx="11" cy="20" r="3" stroke="white" strokeWidth="2" fill="none" />
        <circle cx="21" cy="20" r="3" stroke="white" strokeWidth="2" fill="none" />
    </svg>
);

const EyeIcon = ({ show }) => show ? (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
) : (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
    </svg>
);

const CheckIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

/* ─── REUSABLE FIELD ─── */
const Field = ({ label, error, children }) => (
    <div className="auth-field">
        {label && <label className="auth-label">{label}</label>}
        {children}
        {error && <span className="auth-field-error">{error}</span>}
    </div>
);

/* ════════════════════════════
   EMAIL TAB — LOGIN
════════════════════════════ */
const EmailLogin = ({ onSuccess }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API}/api/users/login/email`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message); return; }
            onSuccess(data.user, data.token);
        } catch { setError("Server error. Check your connection."); }
        finally { setLoading(false); }
    };

    return (
        <form className="auth-form" onSubmit={submit}>
            {error && <div className="auth-error">{error}</div>}

            <Field label="Email Address">
                <input type="email" className="auth-input" placeholder="you@example.com"
                    value={email} onChange={e => { setEmail(e.target.value); setError(""); }} required />
            </Field>

            <Field label="Password">
                <div className="auth-pw-wrap">
                    <input type={showPw ? "text" : "password"} className="auth-input"
                        placeholder="Your password"
                        value={password} onChange={e => { setPassword(e.target.value); setError(""); }} required />
                    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(s => !s)}>
                        <EyeIcon show={showPw} />
                    </button>
                </div>
            </Field>

            <button type="submit" className={`auth-submit-btn ${loading ? "auth-submit-btn--loading" : ""}`} disabled={loading}>
                {loading ? <span className="auth-spinner" /> : "Sign In"}
            </button>
        </form>
    );
};

/* ════════════════════════════
   PHONE OTP TAB
════════════════════════════ */
const PhoneOtp = ({ onSuccess, isRegister }) => {
    const [phone, setPhone] = useState("");
    const [name, setName] = useState("");
    const [otp, setOtp] = useState("");
    const [step, setStep] = useState("phone"); // phone → otp
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [timer, setTimer] = useState(0);

    const startTimer = () => {
        setTimer(60);
        const iv = setInterval(() => setTimer(t => { if (t <= 1) { clearInterval(iv); return 0; } return t - 1; }), 1000);
    };

    const sendOtp = async (e) => {
        e?.preventDefault();
        if (!/^\d{10}$/.test(phone)) { setError("Enter a valid 10-digit number"); return; }
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API}/api/users/otp/send`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message); return; }
            setStep("otp");
            startTimer();
        } catch { setError("Could not send OTP. Try again."); }
        finally { setLoading(false); }
    };

    const verifyOtp = async (e) => {
        e.preventDefault();
        if (otp.length !== 6) { setError("Enter the 6-digit OTP"); return; }
        if (isRegister && !name.trim()) { setError("Enter your name"); return; }
        setLoading(true); setError("");
        try {
            const res = await fetch(`${API}/api/users/otp/verify`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ phone, otp, name: name || undefined }),
            });
            const data = await res.json();
            if (!res.ok) { setError(data.message); return; }
            onSuccess(data.user, data.token);
        } catch { setError("Server error. Try again."); }
        finally { setLoading(false); }
    };

    if (step === "phone") return (
        <form className="auth-form" onSubmit={sendOtp}>
            {error && <div className="auth-error">{error}</div>}

            <Field label="Mobile Number">
                <div className="auth-phone-wrap">
                    <span className="auth-phone-prefix">+91</span>
                    <input className="auth-input auth-input--phone"
                        type="tel" placeholder="10-digit number"
                        value={phone} maxLength={10}
                        onChange={e => { setPhone(e.target.value.replace(/\D/, "")); setError(""); }} />
                </div>
            </Field>

            <button type="submit" className={`auth-submit-btn ${loading ? "auth-submit-btn--loading" : ""}`} disabled={loading}>
                {loading ? <span className="auth-spinner" /> : "Send OTP"}
            </button>
        </form>
    );

    return (
        <form className="auth-form" onSubmit={verifyOtp}>
            {error && <div className="auth-error">{error}</div>}

            <div className="auth-otp-sent">
                <CheckIcon />
                OTP sent to +91 {phone}
                <button type="button" className="auth-change-phone" onClick={() => { setStep("phone"); setOtp(""); setError(""); }}>
                    Change
                </button>
            </div>

            {/* Name field only for new users (register flow) */}
            {isRegister && (
                <Field label="Your Name">
                    <input className="auth-input" placeholder="Full name"
                        value={name} onChange={e => { setName(e.target.value); setError(""); }} />
                </Field>
            )}

            <Field label="Enter OTP">
                <input className="auth-input auth-input--otp"
                    type="tel" placeholder="6-digit code"
                    value={otp} maxLength={6}
                    onChange={e => { setOtp(e.target.value.replace(/\D/, "")); setError(""); }} />
            </Field>

            <div className="auth-resend">
                {timer > 0 ? (
                    <span>Resend in {timer}s</span>
                ) : (
                    <button type="button" className="auth-resend-btn" onClick={sendOtp}>
                        Resend OTP
                    </button>
                )}
            </div>

            <button type="submit" className={`auth-submit-btn ${loading ? "auth-submit-btn--loading" : ""}`} disabled={loading}>
                {loading ? <span className="auth-spinner" /> : "Verify & Continue"}
            </button>
        </form>
    );
};

/* ════════════════════════════
   REGISTER — Email+Password
════════════════════════════ */
const EmailRegister = ({ onSuccess }) => {
    const [form, setForm] = useState({ name: "", email: "", phone: "", password: "", confirm: "" });
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => { setForm(f => ({ ...f, [k]: v })); setErrors(e => { const n = { ...e }; delete n[k]; return n; }); };

    const validate = () => {
        const e = {};
        if (!form.name.trim()) e.name = "Required";
        if (!form.email && !form.phone) e.email = "Email or phone required";
        if (form.email && !/\S+@\S+\.\S+/.test(form.email)) e.email = "Invalid email";
        if (!form.password || form.password.length < 6) e.password = "Min 6 characters";
        if (form.password !== form.confirm) e.confirm = "Passwords don't match";
        setErrors(e);
        return !Object.keys(e).length;
    };

    const submit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setLoading(true);
        try {
            const res = await fetch(`${API}/api/users/register`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: form.name, email: form.email || undefined, phone: form.phone || undefined, password: form.password }),
            });
            const data = await res.json();
            if (!res.ok) { setErrors({ _: data.message }); return; }
            onSuccess(data.user, data.token);
        } catch { setErrors({ _: "Server error." }); }
        finally { setLoading(false); }
    };

    return (
        <form className="auth-form" onSubmit={submit}>
            {errors._ && <div className="auth-error">{errors._}</div>}

            <Field label="Full Name *" error={errors.name}>
                <input className={`auth-input ${errors.name ? "auth-input--error" : ""}`} placeholder="Sai Arvind"
                    value={form.name} onChange={e => set("name", e.target.value)} />
            </Field>

            <div className="auth-row">
                <Field label="Email" error={errors.email}>
                    <input type="email" className={`auth-input ${errors.email ? "auth-input--error" : ""}`}
                        placeholder="you@example.com"
                        value={form.email} onChange={e => set("email", e.target.value)} />
                </Field>
                <Field label="Phone (optional)">
                    <div className="auth-phone-wrap">
                        <span className="auth-phone-prefix">+91</span>
                        <input className="auth-input auth-input--phone" type="tel" placeholder="10-digit"
                            value={form.phone} maxLength={10}
                            onChange={e => set("phone", e.target.value.replace(/\D/, ""))} />
                    </div>
                </Field>
            </div>

            <Field label="Password *" error={errors.password}>
                <div className="auth-pw-wrap">
                    <input type={showPw ? "text" : "password"} className={`auth-input ${errors.password ? "auth-input--error" : ""}`}
                        placeholder="At least 6 characters"
                        value={form.password} onChange={e => set("password", e.target.value)} />
                    <button type="button" className="auth-pw-toggle" onClick={() => setShowPw(s => !s)}>
                        <EyeIcon show={showPw} />
                    </button>
                </div>
            </Field>

            <Field label="Confirm Password *" error={errors.confirm}>
                <input type="password" className={`auth-input ${errors.confirm ? "auth-input--error" : ""}`}
                    placeholder="Repeat password"
                    value={form.confirm} onChange={e => set("confirm", e.target.value)} />
            </Field>

            <button type="submit" className={`auth-submit-btn ${loading ? "auth-submit-btn--loading" : ""}`} disabled={loading}>
                {loading ? <span className="auth-spinner" /> : "Create Account"}
            </button>
        </form>
    );
};

/* ════════════════════════════
   MAIN PAGE
════════════════════════════ */
const AuthPage = ({ mode = "login" }) => {
    const navigate = useNavigate();
    const { login: setAuth } = useUser();

    // isLogin controls Login vs Register
    const [isLogin, setIsLogin] = useState(mode === "login");
    // method: "email" or "phone"
    const [method, setMethod] = useState("email");

    const handleSuccess = (user, token) => {
        setAuth(user, token);
        // go back to where they came from, or home
        navigate(sessionStorage.getItem("authRedirect") || "/");
        sessionStorage.removeItem("authRedirect");
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
                        <span className="auth-logo-sub">Gear Store</span>
                    </div>
                </div>

                {/* LOGIN / REGISTER TOGGLE */}
                <div className="auth-mode-toggle">
                    <button
                        className={`auth-mode-btn ${isLogin ? "auth-mode-btn--active" : ""}`}
                        onClick={() => setIsLogin(true)}
                    >Sign In</button>
                    <button
                        className={`auth-mode-btn ${!isLogin ? "auth-mode-btn--active" : ""}`}
                        onClick={() => setIsLogin(false)}
                    >Create Account</button>
                </div>

                {/* TITLE */}
                <h1 className="auth-title">
                    {isLogin ? "Welcome back" : "Join MotoPark"}
                </h1>
                <p className="auth-subtitle">
                    {isLogin
                        ? "Sign in to track orders and manage your account"
                        : "Create an account to get started"
                    }
                </p>

                {/* METHOD PILLS */}
                <div className="auth-method-pills">
                    <button
                        className={`auth-method-pill ${method === "email" ? "auth-method-pill--active" : ""}`}
                        onClick={() => setMethod("email")}
                    >
                        📧 Email
                    </button>
                    <button
                        className={`auth-method-pill ${method === "phone" ? "auth-method-pill--active" : ""}`}
                        onClick={() => setMethod("phone")}
                    >
                        📱 Phone OTP
                    </button>
                </div>

                {/* FORM */}
                {isLogin ? (
                    method === "email"
                        ? <EmailLogin onSuccess={handleSuccess} />
                        : <PhoneOtp onSuccess={handleSuccess} isRegister={false} />
                ) : (
                    method === "email"
                        ? <EmailRegister onSuccess={handleSuccess} />
                        : <PhoneOtp onSuccess={handleSuccess} isRegister={true} />
                )}

                {/* SWITCH MODE */}
                <p className="auth-switch">
                    {isLogin ? "Don't have an account? " : "Already have an account? "}
                    <button className="auth-switch-btn" onClick={() => setIsLogin(v => !v)}>
                        {isLogin ? "Sign Up" : "Sign In"}
                    </button>
                </p>
            </div>
        </div>
    );
};

export default AuthPage;