import { useEffect, useRef } from 'react';

/**
 * GoogleSignIn — renders the official "Continue with Google" button via Google
 * Identity Services. On success, hands the ID token (credential) up via
 * onCredential; the parent exchanges it for our app session (server-verified).
 * Renders nothing if VITE_GOOGLE_CLIENT_ID isn't set.
 */
const GSI_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

function loadGsi() {
  return new Promise((resolve) => {
    if (window.google?.accounts?.id) return resolve(true);
    const existing = document.getElementById('gsi-client');
    if (existing) {
      existing.addEventListener('load', () => resolve(true), { once: true });
      existing.addEventListener('error', () => resolve(false), { once: true });
      return;
    }
    const s = document.createElement('script');
    s.id = 'gsi-client';
    s.src = GSI_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.head.appendChild(s);
  });
}

export default function GoogleSignIn({ onCredential, onError }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let alive = true;
    loadGsi().then((ok) => {
      if (!alive) return;
      const gid = window.google?.accounts?.id;
      if (!ok || !gid || !ref.current) {
        onError?.('Couldn’t load Google sign-in. Please use your email instead.');
        return;
      }
      gid.initialize({
        client_id: CLIENT_ID,
        callback: (resp) => {
          if (resp?.credential) onCredential(resp.credential);
        },
      });
      const width = Math.min(ref.current.offsetWidth || 320, 400);
      gid.renderButton(ref.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        logo_alignment: 'center',
        width,
      });
    });
    return () => {
      alive = false;
    };
  }, [onCredential, onError]);

  if (!CLIENT_ID) return null;
  return <div ref={ref} style={{ display: 'flex', justifyContent: 'center', minHeight: 44 }} />;
}
