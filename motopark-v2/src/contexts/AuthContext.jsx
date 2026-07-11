import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AUTH_TOKEN_KEY } from '@/lib/api.js';
import * as authService from '@/services/auth.js';

/**
 * AuthContext — session for the guest→member journey. Holds the JWT + user,
 * persisted to localStorage (token under AUTH_TOKEN_KEY so api.js can attach it).
 * On mount, a stored token is re-validated by fetching the profile; a 401 logs
 * out. Login/register/OTP flows all persist { token, user } on success.
 */
const USER_KEY = 'mp-auth-user';
const AuthContext = createContext(null);

function loadUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY)) || null;
  } catch {
    return null;
  }
}
function loadToken() {
  try {
    return localStorage.getItem(AUTH_TOKEN_KEY) || null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(loadUser);
  const [token, setToken] = useState(loadToken);

  const persist = useCallback((tok, usr) => {
    setToken(tok);
    setUser(usr);
    try {
      if (tok) localStorage.setItem(AUTH_TOKEN_KEY, tok);
      else localStorage.removeItem(AUTH_TOKEN_KEY);
      if (usr) localStorage.setItem(USER_KEY, JSON.stringify(usr));
      else localStorage.removeItem(USER_KEY);
    } catch {
      /* private mode — non-fatal */
    }
  }, []);

  // Re-validate a stored token once on mount (refreshes user; 401 → logout).
  useEffect(() => {
    if (!token) return;
    let alive = true;
    authService
      .fetchProfile()
      .then((u) => {
        if (!alive || !u) return;
        setUser(u);
        try {
          localStorage.setItem(USER_KEY, JSON.stringify(u));
        } catch {
          /* ignore */
        }
      })
      .catch((err) => {
        // Only drop the session on an explicit auth failure — not on network/CORS.
        if (alive && err?.code === 401) persist(null, null);
      });
    return () => {
      alive = false;
    };
    // run once for the initially-loaded token
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = useCallback(
    async (creds) => {
      const { token: t, user: u } = await authService.loginWithPassword(creds);
      persist(t, u);
      return u;
    },
    [persist],
  );

  const register = useCallback(
    async (details) => {
      const { token: t, user: u } = await authService.registerUser(details);
      persist(t, u);
      return u;
    },
    [persist],
  );

  const sendOtp = useCallback((email) => authService.sendLoginOtp(email), []);

  const loginWithGoogle = useCallback(
    async (credential) => {
      const { token: t, user: u } = await authService.loginWithGoogle(credential);
      persist(t, u);
      return u;
    },
    [persist],
  );

  const verifyOtp = useCallback(
    async (payload) => {
      const { token: t, user: u } = await authService.verifyLoginOtp(payload);
      persist(t, u);
      return u;
    },
    [persist],
  );

  const logout = useCallback(() => persist(null, null), [persist]);

  /** Replace the cached user (e.g. after profile/address edits) — keeps token. */
  const applyUser = useCallback((u) => {
    setUser(u);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(u));
    } catch {
      /* ignore */
    }
  }, []);

  const value = useMemo(
    () => ({
      user, token, isAuthed: Boolean(token),
      login, register, sendOtp, verifyOtp, loginWithGoogle, logout, applyUser,
    }),
    [user, token, login, register, sendOtp, verifyOtp, loginWithGoogle, logout, applyUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
