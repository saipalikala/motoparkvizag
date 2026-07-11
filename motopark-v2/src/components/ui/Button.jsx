import styles from './Button.module.css';

/**
 * Button — DS primitive (docs/09 §buttons). Context-free, props-only.
 *
 * variant: 'primary' (orange CTA) | 'secondary' (navy) | 'outline' | 'ghost'
 * size:    'sm' | 'md' | 'lg'
 * onDark:  recolors outline/ghost for navy surfaces (cinematic hero, footer)
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

  return <Comp className={cls} {...typeProp} {...rest} />;
}
