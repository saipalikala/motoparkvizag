import { cloudinaryUrl } from '@/lib/image.js';
import styles from '../ProductHero.module.css';

export default function HeroImage({ imageSrc, productName }) {
  if (!imageSrc) {
    return (
      <span className={styles.stageFallback} aria-hidden="true">
        MP
      </span>
    );
  }

  return (
    <img
      key={imageSrc}
      src={cloudinaryUrl(imageSrc, { w: 1400 })}
      alt={productName}
      width="900"
      height="1100"
      className={styles.heroImg}
    />
  );
}
