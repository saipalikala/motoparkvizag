import { createContext, useContext, useState, useCallback, useMemo, useRef } from 'react';
import { CheckCircle2, AlertCircle, Info, XCircle } from 'lucide-react';
import styles from '@/components/ui/Toast.module.css';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);
  const [exiting, setExiting] = useState(false);
  const timerRef = useRef(null);

  const showToast = useCallback((message, type = 'success', duration = 2200) => {
    clearTimeout(timerRef.current);
    setExiting(false);
    setToast({ id: Date.now(), message, type });

    timerRef.current = setTimeout(() => {
      setExiting(true);
      setTimeout(() => {
        setToast(null);
        setExiting(false);
      }, 220);
    }, duration);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  const renderIcon = (type) => {
    switch (type) {
      case 'success':
        return <CheckCircle2 size={18} className={styles.iconSuccess} aria-hidden="true" />;
      case 'warning':
        return <AlertCircle size={18} className={styles.iconWarning} aria-hidden="true" />;
      case 'error':
        return <XCircle size={18} className={styles.iconError} aria-hidden="true" />;
      default:
        return <Info size={18} className={styles.iconInfo} aria-hidden="true" />;
    }
  };

  const getToastClass = (type) => {
    switch (type) {
      case 'success':
        return styles.toastSuccess;
      case 'warning':
        return styles.toastWarning;
      case 'error':
        return styles.toastError;
      default:
        return styles.toastInfo;
    }
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <div className={styles.toastContainer} aria-live="polite" role="status">
          <div className={`${styles.toast} ${getToastClass(toast.type)} ${exiting ? styles.toastExiting : ''}`}>
            {renderIcon(toast.type)}
            <span className={styles.toastText}>{toast.message}</span>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
