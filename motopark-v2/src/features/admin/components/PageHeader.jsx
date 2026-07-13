import styles from './PageHeader.module.css';

/**
 * PageHeader — the title block every admin page opens with.
 *
 * props:
 *   title    — page heading (required)
 *   subtitle — optional supporting line
 *   actions  — optional right-aligned node (buttons, filters)
 */
export default function PageHeader({ title, subtitle, actions }) {
  return (
    <header className={styles.header}>
      <div className={styles.text}>
        <h1 className={styles.title}>{title}</h1>
        {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      </div>
      {actions && <div className={styles.actions}>{actions}</div>}
    </header>
  );
}
