import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import { useAdminAuth } from '../AdminAuthContext.jsx';
import styles from './AdminLoginPage.module.css';

/**
 * AdminLoginPage — entry to the admin realm. Posts to POST /api/admin/login via
 * AdminAuthContext.login(). On success, returns to the originally-requested
 * admin path (from location state) or the dashboard.
 *
 * NOTE: email/password credentials — no autofill of any saved storefront
 * session, and the field values never leave this component except through the
 * admin API.
 */
export default function AdminLoginPage() {
  const { isAuthed, login } = useAdminAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname ?? '/admin';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Already signed in → skip the form.
  if (isAuthed) return <Navigate to={from} replace />;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    setError(null);
    setSubmitting(true);
    try {
      await login({ email: email.trim(), password });
      navigate(from, { replace: true });
    } catch (err) {
      setError(err?.message ?? 'Login failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.screen}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.badge} aria-hidden="true">
            <ShieldCheck size={22} />
          </span>
          <div>
            <h1 className={styles.title}>MotoPark Admin</h1>
            <p className={styles.subtitle}>Sign in to manage your store</p>
          </div>
        </div>

        <form className={styles.form} onSubmit={onSubmit} noValidate>
          <label className={styles.field}>
            <span className={styles.label}>Email</span>
            <input
              type="email"
              name="email"
              autoComplete="username"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@motoparkvizag.in"
              required
              autoFocus
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>Password</span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </label>

          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            className={styles.submit}
            disabled={submitting || !email.trim() || !password}
          >
            {submitting ? (
              <>
                <Loader2 size={18} className={styles.spin} /> Signing in…
              </>
            ) : (
              <>
                <Lock size={18} /> Sign in
              </>
            )}
          </Button>
        </form>

        <p className={styles.foot}>Authorized personnel only.</p>
      </div>
    </div>
  );
}
