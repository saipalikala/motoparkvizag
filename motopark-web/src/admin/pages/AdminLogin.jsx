import { useState } from "react";
import { adminLogin } from "@/admin/utils/api";
import "./AdminLogin.css";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await adminLogin(email, password);
      if (data?.token) {
        localStorage.setItem("adminToken", data.token);
        window.location.href = "/admin";
      } else {
        setError(data?.message || "Login failed");
      }
    } catch (err) {
      setError(err.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="al-page">
      <div className="al-bg" aria-hidden="true" />
      <form className="al-card" onSubmit={handleLogin}>
        <div className="al-logo-wrap">
          <div className="al-logo-dot" aria-hidden="true" />
          <div>
            <span className="al-logo-name">MotoPark</span>
            <span className="al-logo-sub">Admin Panel</span>
          </div>
        </div>
        <h1 className="al-title">Welcome back</h1>
        <p className="al-subtitle">Sign in to manage your store</p>
        {error && (
          <div className="al-error" role="alert">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            {error}
          </div>
        )}
        <div className="al-field">
          <label>Email address</label>
          <input type="email" placeholder="admin@motopark.in" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
        </div>
        <div className="al-field">
          <label>Password</label>
          <input type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
        </div>
        <button type="submit" className={`al-btn ${loading ? "al-btn--loading" : ""}`} disabled={loading}>
          {loading ? "Signing in…" : "Sign In"}
        </button>
        <p className="al-hint">MotoPark · Admin Access Only</p>
      </form>
    </div>
  );
}