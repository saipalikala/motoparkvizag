import { Loader2 } from 'lucide-react';
import styles from './Button.module.css';

/**
 * Button — DS primitive (docs/09 §buttons). Context-free, props-only.
 *
 * variant: 'primary' (orange CTA) | 'secondary' (solid navy) | 'outline' (docs'
 *          "Secondary" spec — transparent, navy border) | 'ghost' | 'danger'
 * size:    'sm' | 'md' | 'lg'
 * onDark:  recolors outline/ghost for navy surfaces (cinematic hero, footer)
 * loading: swaps the label for a spinner (width stays locked — the label box
 *          is hidden, not removed) and blocks interaction. Default false, so
 *          every existing call site renders identically to before this prop
 *          existed.
 * as:      element/component to render (e.g. Link) — defaults to <button>
 *
 * Commerce Law 2: orange lives on `primary` only; never on focus (global ring is blue).
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  onDark = false,
  as: Comp = 'button',
  className = '',
  type,
  loading = false,
  disabled = false,
  children,
  ...rest
}) {
  const cls = [
    styles.btn,
    styles[variant],
    styles[size],
    onDark ? styles.onDark : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  // Only real <button>s get a default type (avoid invalid attr on <a>/<Link>).
  const typeProp = Comp === 'button' ? { type: type || 'button' } : {};
  const blocked = disabled || loading;
  const blockedProp =
    Comp === 'button' ? { disabled: blocked } : { 'aria-disabled': blocked || undefined };

  return (
    <Comp className={cls} {...typeProp} {...blockedProp} aria-busy={loading || undefined} {...rest}>
      {loading ? (
        <>
          <span className={styles.labelHidden}>{children}</span>
          <span className={styles.spinner} aria-hidden="true">
            <Loader2 size={size === 'sm' ? 14 : 18} strokeWidth={2} />
          </span>
        </>
      ) : (
        children
      )}
    </Comp>
  );
}
