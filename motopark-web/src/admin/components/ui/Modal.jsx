import { useEffect, useRef, memo } from "react";
import { createPortal } from "react-dom";
import "./AdminLayout.css";

/* ================================================================
   MODAL
   Usage:
     <Modal
       open={showModal}
       onClose={() => setShowModal(false)}
       title="Add Product"
       subtitle="Fill in the details below"
       size="lg"
       footer={
         <>
           <button className="btn btn--ghost" onClick={() => setShowModal(false)}>Cancel</button>
           <button className="btn btn--primary" onClick={handleSave}>Save</button>
         </>
       }
     >
       <div>...content...</div>
     </Modal>
   ================================================================ */
const Modal = memo(({
    open,
    onClose,
    title,
    subtitle,
    size = "md",  // "sm" | "md" | "lg"
    footer,
    children,
    hideClose = false,
}) => {
    const overlayRef = useRef(null);
    const firstFocusRef = useRef(null);
    const prevFocusRef  = useRef(null);

    /* Focus trap + return focus on close */
    useEffect(() => {
        if (!open) return;
        prevFocusRef.current = document.activeElement;

        // Focus first focusable element inside modal
        const el = overlayRef.current?.querySelector(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        setTimeout(() => (el || overlayRef.current)?.focus(), 60);

        return () => prevFocusRef.current?.focus();
    }, [open]);

    /* Close on Escape */
    useEffect(() => {
        if (!open) return;
        const handler = (e) => { if (e.key === "Escape") onClose(); };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [open, onClose]);

    /* Prevent body scroll */
    useEffect(() => {
        if (open) document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, [open]);

    if (!open) return null;

    return createPortal(
        <div
            className="modal-overlay"
            ref={overlayRef}
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            <div className={`modal modal--${size}`} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="modal__header">
                    <div>
                        {title && (
                            <div className="modal__title" id="modal-title">{title}</div>
                        )}
                        {subtitle && (
                            <div className="modal__sub">{subtitle}</div>
                        )}
                    </div>
                    {!hideClose && (
                        <button
                            className="modal__close"
                            onClick={onClose}
                            aria-label="Close modal"
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                                stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="modal__body" ref={firstFocusRef}>
                    {children}
                </div>

                {/* Footer */}
                {footer && (
                    <div className="modal__footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
});

Modal.displayName = "Modal";
export default Modal;