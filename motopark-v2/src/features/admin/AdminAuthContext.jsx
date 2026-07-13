import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  ADMIN_TOKEN_KEY,
  ADMIN_UNAUTHORIZED_EVENT,
} from './lib/adminApi.js';
import * as adminAuth from './services/adminAuth.js';

/**
 * AdminAuthContext — the admin realm's session, fully isolated from the
 * storefront AuthContext. Holds only a JWT (backend login returns no user
 * object); admin identity (email/role) is decoded from the token itself.
 *
 * Isolation guarantees (docs/HANDOFF §3):
 *   • distinct storage key (adminToken) — never touches mp-auth-token
 *   • distinct API client (adminApi)
 *   • a 401 from adminApi drops THIS session only
 */
const AdminAuthContext = createContext(null);

/** Decode a JWT payload without verifying (display + expiry only; the server is
 *  the real authority). Returns null on any malformed token. */
function decodeJwt(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(base64));
  } catch {
    return null;
  }
}

function isExpired(payload) {
  return Boolean(payload?.exp && payload.exp * 1000 <= Date.now());
}

/** Read a stored token, discarding it if malformed or already expired. */
function loadToken() {
  try {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (!token) return null;
    const payload = decodeJwt(token);
    if (!payload || isExpired(payload)) {
      localStorage.removeItem(ADMIN_TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(loadToken);

  const persist = useCallback((tok) => {
    setToken(tok);
    try {
      if (tok) localStorage.setItem(ADMIN_TOKEN_KEY, tok);
      else localStorage.removeItem(ADMIN_TOKEN_KEY);
    } catch {
      /* private mode — non-fatal */
    }
  }, []);

  const login = useCallback(
    async (creds) => {
      const tok = await adminAuth.login(creds);
      persist(tok);
      return tok;
    },
    [persist],
  );

  const logout = useCallback(async () => {
    await adminAuth.logout(); // best-effort server revoke
    persist(null);
  }, [persist]);

  // adminApi dispatches this on any 401 (expired/revoked token) → drop session.
  useEffect(() => {
    const onUnauthorized = () => persist(null);
    window.addEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
    return () => window.removeEventListener(ADMIN_UNAUTHORIZED_EVENT, onUnauthorized);
  }, [persist]);

  const admin = useMemo(() => (token ? decodeJwt(token) : null), [token]);

  const value = useMemo(
    () => ({
      token,
      admin, // { role, email, iat, exp } | null
      email: admin?.email ?? null,
      isAuthed: Boolean(token),
      login,
      logout,
    }),
    [token, admin, login, logout],
  );

  return <AdminAuthContext.Provider value={value}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within AdminAuthProvider');
  return ctx;
}
