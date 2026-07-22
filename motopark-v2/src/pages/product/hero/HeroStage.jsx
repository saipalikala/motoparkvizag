import HeroGradient from './HeroGradient.jsx';
import ProductImageGallery from '@/components/commerce/gallery/ProductImageGallery.jsx';
import styles from '../ProductHero.module.css';

/**
 * HeroStage — Monumental Hero stage composing presentation-agnostic ProductImageGallery
 * with PDP-specific HeroGradient mask layer and semantic theme styles.
 */
export default function HeroStage({
  productName,
  images = [],
  imageSrc,
  imgIdx = 0,
  setImgIdx,
  themeClass = '',
}) {
  return (
    <div className={`${styles.heroStage} ${themeClass}`}>
      <ProductImageGallery
        images={images}
        image={imageSrc}
        selectedIndex={imgIdx}
        onIndexChange={setImgIdx}
        alt={productName}
        imageWidth={1000}
        containerClassName={styles.heroGalleryContainer}
        imageClassName={styles.heroGalleryImage}
      >
        {/* Composition: PDP signature left-to-right gradient fade mask */}
        <HeroGradient />
      </ProductImageGallery>
    </div>
  );
}
