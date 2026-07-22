import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import HeroContent from './hero/HeroContent.jsx';
import HeroStage from './hero/HeroStage.jsx';
import HeroMobilePurchaseBar from './hero/HeroMobilePurchaseBar.jsx';
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
  const [stickyVisible, setStickyVisible] = useState(false);
  const actionBlockRef = useRef(null);

  const themeClass = getHeroThemeClass(product.category, product.brand);
  const isWish = wishHas(product.id);

  // IntersectionObserver to reveal sticky mobile purchase bar when main action block scrolls off-screen
  useEffect(() => {
    const el = actionBlockRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setStickyVisible(!entry.isIntersecting);
      },
      { threshold: 0.1, rootMargin: '0px 0px -40px 0px' },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

      {/* ── Mobile-First & Desktop Editorial Showcase Grid ────── */}
      <div className={styles.heroGrid}>
        {/* Hero Stage: Placed first on mobile (<1024px) via CSS grid order, second on desktop (≥1024px) */}
        <HeroStage
          productName={product.name}
          images={images}
          imageSrc={images[imgIdx]}
          imgIdx={imgIdx}
          setImgIdx={setImgIdx}
          themeClass={themeClass}
        />

        {/* Hero Content */}
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
          actionBlockRef={actionBlockRef}
        />
      </div>

      {/* ── Mobile Sticky Purchase Bar ──────────────────────────── */}
      <HeroMobilePurchaseBar
        product={product}
        variant={variant}
        canAdd={canAdd}
        needsSize={needsSize}
        size={size}
        handleAdd={handleAdd}
        added={added}
        visible={stickyVisible}
      />
    </section>
  );
}
