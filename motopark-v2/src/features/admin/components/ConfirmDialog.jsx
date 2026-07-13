import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import styles from './ConfirmDialog.module.css';

/**
 * ConfirmDialog — a small modal for destructive confirmations (e.g. delete).
 * Controlled: renders nothing when `open` is false.
 *
 * props: open, title, message, confirmLabel, cancelLabel, danger, busy,
 *        onConfirm, onCancel
 */
export default function ConfirmDialog({
  open,
  title = 'Are you sure?',
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  busy = false,
  onConfirm,
  onCancel,
}) {
  // Escape closes; lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && !busy && onCancel?.();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, busy, onCancel]);

  if (!open) return null;

  return (
    <div className={styles.overlay} onClick={busy ? undefined : onCancel}>
      <div
        className={styles.dialog}
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          className={styles.close}
          onClick={onCancel}
          disabled={busy}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className={styles.body}>
          {danger && (
            <span className={styles.icon} aria-hidden="true">
              <AlertTriangle size={22} />
            </span>
          )}
          <h2 className={styles.title}>{title}</h2>
          {message && <p className={styles.message}>{message}</p>}
        </div>

        <div className={styles.actions}>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'primary' : 'secondary'}
            onClick={onConfirm}
            disabled={busy}
            className={danger ? styles.dangerBtn : ''}
          >
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
