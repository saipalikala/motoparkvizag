/**
 * src/context/UserContext.jsx
 *
 * FIXES APPLIED:
 * ─────────────────────────────────────────────────────────────
 * [F1] Token key inconsistency fixed
 *      Before: localStorage.setItem("userToken", tokenValue)
 *      But CartContext reads: localStorage.getItem("motopark_token")
 *      These are DIFFERENT keys. Cart auth header always returned
 *      null token → every authenticated cart/wishlist sync failed
 *      silently with 401.
 *      After: both keys written on login so both consumers work.
 *      Long term: consolidate to one key — use "motopark_token".
 *
 * [F2] Token key also cleared on logout
 *      Before: logout removed "userToken" but not "motopark_token".
 *      After: both keys cleared.
 *
 * [F3] Boot reads both keys for backwards compatibility
 *      Existing users may have "userToken" in localStorage from
 *      before this fix. Boot reads both and uses whichever exists.
 *
 * All existing functionality (login, logout, updateUser, ready flag)
 * preserved exactly.
 */

import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user,  setUser]  = useState(null);
  const [token, setToken] = useState(null);
  const [ready, setReady] = useState(false);

  /* ── Boot from localStorage ── */
  useEffect(() => {
    try {
      const u = localStorage.getItem("userInfo");
      // [F3]: read both keys — backwards compat
      const t = localStorage.getItem("motopark_token") || localStorage.getItem("userToken");
      if (u && t) {
        setUser(JSON.parse(u));
        setToken(t);
      }
    } catch { /* ignore parse errors */ }
    setReady(true);
  }, []);

  /* ── Login ── */
  const login = (userData, tokenValue) => {
    setUser(userData);
    setToken(tokenValue);
    localStorage.setItem("userInfo",       JSON.stringify(userData));
    // [F1]: write BOTH keys so CartContext + WishlistContext both work
    localStorage.setItem("motopark_token", tokenValue);
    localStorage.setItem("userToken",      tokenValue); // legacy compat
    window.dispatchEvent(new Event("userAuthChange"));
  };

  /* ── Logout ── */
  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("userInfo");
    // [F2]: remove BOTH keys
    localStorage.removeItem("motopark_token");
    localStorage.removeItem("userToken");
    window.dispatchEvent(new Event("userAuthChange"));
  };

  /* ── Update user info (after profile edit) ── */
  const updateUser = (userData) => {
    setUser(userData);
    localStorage.setItem("userInfo", JSON.stringify(userData));
  };

  return (
    <UserContext.Provider value={{ user, token, ready, login, logout, updateUser }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside <UserProvider>");
  return ctx;
};

export default UserContext;