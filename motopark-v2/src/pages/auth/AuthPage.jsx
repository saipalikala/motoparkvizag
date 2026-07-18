import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import Field from '@/components/ui/Field.jsx';
import GoogleSignIn from '@/features/auth/GoogleSignIn.jsx';
import { useAuth } from '@/contexts/AuthContext.jsx';
import logoBadge from '@/assets/images/logo-badge.png';
import styles from './AuthPage.module.css';

const GOOGLE_ENABLED = Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID);

/**
 * AuthPage `/login` — Google Sign-In + passwordless email-code (OTP). Both hand
 * back { token, user } and are persisted by AuthContext. Redirects to
 * `?redirect=` || /account; bounces already-authed users.
 */
export default function AuthPage() {
  const { isAuthed, sendOtp, verifyOtp, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const redirectTo = params.get('redirect') || '/account';

  const [step, setStep] = useState('email'); // 'email' | 'code'
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  useEffect(() => {
    if (isAuthed) navigate(redirectTo, { replace: true });
  }, [isAuthed, navigate, redirectTo]);

  const fail = (e) => setError(e?.message || 'Something went wrong. Please try again.');

  const handleGoogle = useCallback(
    async (credential) => {
      setError('');
      setLoading(true);
      try {
        await loginWithGoogle(credential);
        navigate(redirectTo, { replace: true });
      } catch (err) {
        setError(err?.message || 'Google sign-in failed. Please try again.');
      } finally {
        setLoading(false);
      }
    },
    [loginWithGoogle, navigate, redirectTo],
  );

  const googleError = useCallback((msg) => setError(msg), []);

  const requestCode = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');
    setLoading(true);
    try {
      await sendOtp(email.trim());
      setStep('code');
      setInfo(`We emailed a 6-digit code to ${email.trim()}.`);
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmCode = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp({ email: email.trim(), otp: otp.trim() });
      navigate(redirectTo, { replace: true });
    } catch (err) {
      fail(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`container section ${styles.wrap}`}>
      <Helmet>
        <title>Sign in — MotoPark</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <div className={styles.card}>
        <Link to="/" className={styles.brand} aria-label="MotoPark — home">
          <img src={logoBadge} alt="" width="40" height="40" />
        </Link>
        <h1 className={styles.title}>Sign in to MotoPark</h1>
        <p className={styles.sub}>
          Sign in to track orders, save your wishlist, and check out faster.
        </p>

        {error && <p className={styles.error} role="alert">{error}</p>}
        {info && !error && <p className={styles.info} role="status">{info}</p>}

        {GOOGLE_ENABLED && (
          <>
            <GoogleSignIn onCredential={handleGoogle} onError={googleError} />
            <div className={styles.divider}><span>or with email</span></div>
          </>
        )}

        {step === 'email' ? (
          <form onSubmit={requestCode} className={styles.form}>
            <Field
              id="otp-email"
              label="Email address"
              type="email"
              placeholder="you@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              autoFocus
              required
            />
            <Button type="submit" variant="primary" size="lg" className={styles.submit} disabled={loading}>
              <Mail size={17} strokeWidth={2} aria-hidden="true" />
              {loading ? 'Sending…' : 'Email me a login code'}
            </Button>
          </form>
        ) : (
          <form onSubmit={confirmCode} className={styles.form}>
            <button
              type="button"
              className={styles.back}
              onClick={() => { setStep('email'); setInfo(''); setOtp(''); }}
            >
              <ArrowLeft size={14} strokeWidth={2} aria-hidden="true" /> Use a different email
            </button>
            <Field
              id="otp-code"
              label="Enter the 6-digit code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              controlClassName={styles.code}
              placeholder="••••••"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
              autoFocus
              required
            />
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className={styles.submit}
              disabled={loading || otp.length < 6}
            >
              {loading ? 'Verifying…' : 'Verify & sign in'}
            </Button>
          </form>
        )}

        <p className={styles.assurance}>
          <ShieldCheck size={14} strokeWidth={1.9} aria-hidden="true" />
          Google or a one-time email code — no password to remember.
        </p>

        <p className={styles.legal}>
          By continuing you agree to our <Link to="/terms">Terms</Link> and{' '}
          <Link to="/privacy-policy">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
