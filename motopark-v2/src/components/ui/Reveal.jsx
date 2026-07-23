import { useReveal } from '@/hooks/useReveal.js';
import styles from './Reveal.module.css';

/**
 * Wraps a block in a one-shot scroll reveal (docs/10 §17, docs/11 §10).
 *
 * Reveal SECTIONS, not the items inside them. The doctrine caps concurrent
 * animation at 3 elements; staggering a product grid card-by-card blows that
 * instantly and turns browsing into waiting.
 *
 * Never wrap the hero or anything containing the LCP image — see useReveal.
 *
 * Also applies `content-visibility: auto` (Reveal.module.css .skipOffscreen)
 * so a wrapped section costs nothing to layout/paint while off-screen —
 * independent of the reveal-animation state, always on.
 *
 * @param {number} delay    ms, for deliberately sequencing two adjacent blocks.
 * @param {number} duration ms; defaults to the commerce-section 280ms. The
 *                          story band is the one place doctrine allows 400ms.
 */
export default function Reveal({ children, className = '', delay = 0, duration }) {
  const { ref, armed, revealed } = useReveal();

  const classes = [styles.skipOffscreen, className, armed && styles.armed, revealed && styles.in]
    .filter(Boolean)
    .join(' ');

  const style = {};
  if (delay) style['--reveal-delay'] = `${delay}ms`;
  if (duration) style['--reveal-duration'] = `${duration}ms`;

  return (
    <div ref={ref} className={classes} style={style}>
      {children}
    </div>
  );
}
