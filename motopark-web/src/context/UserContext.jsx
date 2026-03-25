/* ================================================
   File: src/context/UserContext.jsx

   Wrap your App with <UserProvider> in main.jsx
   ================================================ */
import { createContext, useContext, useState, useEffect } from "react";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(null);
    const [ready, setReady] = useState(false); // true once localStorage checked

    /* ── Boot from localStorage ── */
    useEffect(() => {
        try {
            const u = localStorage.getItem("userInfo");
            const t = localStorage.getItem("userToken");
            if (u && t) { setUser(JSON.parse(u)); setToken(t); }
        } catch { /* ignore */ }
        setReady(true);
    }, []);

    /* ── Login ── */
    const login = (userData, tokenValue) => {
        setUser(userData);
        setToken(tokenValue);
        localStorage.setItem("userInfo", JSON.stringify(userData));
        localStorage.setItem("userToken", tokenValue);
        window.dispatchEvent(new Event("userAuthChange"));
    };

    /* ── Logout ── */
    const logout = () => {
        setUser(null);
        setToken(null);
        localStorage.removeItem("userInfo");
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