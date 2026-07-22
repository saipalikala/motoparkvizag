import { useState } from 'react';
import { Link } from 'react-router-dom';
import HeroContent from './hero/HeroContent.jsx';
import HeroStage from './hero/HeroStage.jsx';
import styles from './ProductHero.module.css';

/** Map product category/brand to reusable MotoPark V2 semantic hero theme classes */
function getHeroThemeClass(category = '', brand = '') {
  const cat = (category + ' ' + brand).toLowerCase();
  if (cat.includes('helmet') || cat.includes('agv') || cat.includes('axor')) {
    return styles.heroThemeHelmet;
  }
  if (cat.includes('luggage') || cat.includes('bag') || cat.includes('shad')) {
    return styles.heroThemeLuggage;
  }
  if (cat.includes('jacket') || cat.includes('apparel') || cat.includes('riding')) {
    return styles.heroThemeApparel;
  }
  if (cat.includes('part') || cat.includes('exhaust') || cat.includes('performance')) {
    return styles.heroThemePerformance;
  }
  return styles.heroThemeAccessories;
}

export default function ProductHero({
  product,
  colorIdx,
  selectColor,
  imgIdx,
  setImgIdx,
  size,
  setSize,
  qty,
  setQty,
  canAdd,
  needsSize,
  variantInStock,
  chosenSizeObj,
  availableStock,
  discount,
  variant,
  images = [],
  sizes = [],
  handleAdd,
  added,
  wishHas,
  wishToggle,
}) {
  const [copied, setCopied] = useState(false);

  const themeClass = getHeroThemeClass(product.category, product.brand);
  const isWish = wishHas(product.id);

  const handleNext = () => {
    if (images.length <= 1) return;
    setImgIdx((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    if (images.length <= 1) return;
    setImgIdx((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Check out ${product.name} on MotoPark`,
          url: window.location.href,
        });
      } catch {
        // Fallback
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <section className={styles.heroContainer}>
      {/* ── Breadcrumb Navigation ──────────────────────────────── */}
      <nav className={styles.crumb} aria-label="Breadcrumb">
        <Link to="/">Home</Link>
        <span aria-hidden="true">/</span>
        <Link to="/store">Store</Link>
        <span aria-hidden="true">/</span>
        <span className={styles.crumbCurrent}>{product.name}</span>
      </nav>

      {/* ── Editorial 2-Column Showcase Grid ──────────────────── */}
      <div className={styles.heroGrid}>
        {/* Left Content Column */}
        <HeroContent
          product={product}
          colorIdx={colorIdx}
          selectColor={selectColor}
          size={size}
          setSize={setSize}
          qty={qty}
          setQty={setQty}
          canAdd={canAdd}
          needsSize={needsSize}
          variantInStock={variantInStock}
          chosenSizeObj={chosenSizeObj}
          availableStock={availableStock}
          discount={discount}
          variant={variant}
          sizes={sizes}
          handleAdd={handleAdd}
          added={added}
          isWish={isWish}
          wishToggle={wishToggle}
          handleShare={handleShare}
          copied={copied}
        />

        {/* Right Monumental Hero Stage */}
        <HeroStage
          productName={product.name}
          imageSrc={images[imgIdx]}
          imageCount={images.length}
          onNext={handleNext}
          onPrev={handlePrev}
          themeClass={themeClass}
        />
      </div>
    </section>
  );
}
