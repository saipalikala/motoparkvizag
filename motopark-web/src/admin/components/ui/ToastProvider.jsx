import { createContext, useCallback, useContext, useRef, useState, memo } from "react";
import { createPortal } from "react-dom";

// import "@AdminLayout.css";

/* ================================================================
   TOAST SYSTEM
   Usage:
     1. Wrap AdminLayout (or App) with <ToastProvider>
     2. In any component:
          const toast = useToast();
          toast.success("Saved!", "Product updated successfully.");
          toast.error("Error", "Could not save product.");
          toast.info("Note", "Changes are auto-saved.");
          toast.warning("Warning", "Low stock detected.");
   ================================================================ */

const ToastCtx = createContext(null);

/* ── Icons ── */
const icons = {
    success: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#6ee7b7" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
        </svg>
    ),
    error: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#fca5a5" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
        </svg>
    ),
    warning: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#fcd34d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    ),
    info: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#93c5fd" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
    ),
};

/* ── Single toast ── */
const Toast = memo(({ id, type = "info", title, message, onDismiss }) => {
    const [exiting, setExiting] = useState(false);

    const dismiss = useCallback(() => {
        setExiting(true);
        setTimeout(() => onDismiss(id), 250);
    }, [id, onDismiss]);

    return (
        <div
            className={`toast toast--${type}${exiting ? " toast--exiting" : ""}`}
            role="alert"
            aria-live="assertive"
            aria-atomic="true"
        >
            <span className="toast__icon">{icons[type] ?? icons.info}</span>
            <div className="toast__content">
                <div className="toast__title">{title}</div>
                {message && <div className="toast__msg">{message}</div>}
            </div>
            <button
                className="toast__close"
                onClick={dismiss}
                aria-label="Dismiss notification"
            >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
            </button>
        </div>
    );
});
Toast.displayName = "Toast";

/* ── Provider ── */
export const ToastProvider = ({ children }) => {
    const [toasts, setToasts] = useState([]);
    const counterRef = useRef(0);

const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
}, []);

const add = useCallback((type, title, message, duration = 4000) => {
    const id = ++counterRef.current;
    setToasts((prev) => [...prev, { id, type, title, message }]);
    if (duration > 0) setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), duration);
    return id;
}, []);

    const api = {
        success: (title, message, duration)  => add("success", title, message, duration),
        error:   (title, message, duration)  => add("error",   title, message, duration),
        warning: (title, message, duration)  => add("warning", title, message, duration),
        info:    (title, message, duration)  => add("info",    title, message, duration),
        dismiss,
    };

    return (
        <ToastCtx.Provider value={api}>
            {children}
            {createPortal(
                <div className="toast-portal" aria-label="Notifications" role="region">
                    {toasts.map((t) => (
                        <Toast key={t.id} {...t} onDismiss={dismiss} />
                    ))}
                </div>,
                document.body
            )}
        </ToastCtx.Provider>
    );
};

/* ── Hook ── */
export const useToast = () => {
    const ctx = useContext(ToastCtx);
    if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
    return ctx;
};

export default ToastProvider;