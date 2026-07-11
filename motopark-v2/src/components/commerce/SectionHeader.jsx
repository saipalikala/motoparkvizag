import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import styles from './SectionHeader.module.css';

/**
 * SectionHeader — shared eyebrow + title (+ optional action link) for homepage
 * and listing sections. Keeps the orange-eyebrow / Sakana-title rhythm consistent.
 *
 * props: { id, eyebrow?, title, action?: { label, href }, as? = 'h2' }
 * `as` sets the heading level ('h1' for page-level headers, 'h2' for sections).
 */
export default function SectionHeader({ id, eyebrow, title, action, as: Heading = 'h2' }) {
  return (
    <header className={styles.head}>
      <div>
        {eyebrow && <p className={styles.eyebrow}>{eyebrow}</p>}
        <Heading id={id} className={styles.title}>
          {title}
        </Heading>
      </div>
      {action && (
        <Link to={action.href} className={styles.action}>
          {action.label}
          <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />
        </Link>
      )}
    </header>
  );
}
