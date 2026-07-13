import { Hammer } from 'lucide-react';
import PageHeader from '../components/PageHeader.jsx';
import styles from './SectionPlaceholder.module.css';

/**
 * SectionPlaceholder — stand-in for roadmap sections not yet built (Products →
 * Settings). Keeps every nav link routable inside the finished shell so the
 * Foundation milestone is navigable end-to-end; each module replaces its own
 * placeholder as it ships.
 */
export default function SectionPlaceholder({ title, subtitle }) {
  return (
    <div>
      <PageHeader title={title} subtitle={subtitle} />
      <div className={styles.panel}>
        <span className={styles.icon} aria-hidden="true">
          <Hammer size={24} />
        </span>
        <h2 className={styles.heading}>Coming soon</h2>
        <p className={styles.text}>
          This module is on the approved roadmap and will be built after the Foundation
          milestone.
        </p>
      </div>
    </div>
  );
}
