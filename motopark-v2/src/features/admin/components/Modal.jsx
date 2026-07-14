import { useEffect } from 'react';
import { X } from 'lucide-react';
import styles from './Modal.module.css';

/**
 * Modal — reusable centered dialog shell for admin forms. Controlled via `open`.
 * Escape + overlay-click close (blocked while `busy`); body scroll is locked
 * while open. Content is provided as children; footer is an optional node.
 *
 * props: open, title, onClose, busy, size ('md' | 'lg'), footer, children
 */
export default function Modal({ open, title, onClose, busy = false, size = 'md', footer, children }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !busy && onClose?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onClose]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={busy ? undefined : onClose}>
      <div
        className={`${styles.dialog} ${size === 'lg' ? styles.lg : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button
            type="button"
            className={styles.close}
            onClick={onClose}
            disabled={busy}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className={styles.body}>{children}</div>

        {footer && <footer className={styles.footer}>{footer}</footer>}
      </div>
    </div>
  );
}
