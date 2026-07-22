import { useState, useRef } from 'react';
import HeroImage from './HeroImage.jsx';
import HeroGradient from './HeroGradient.jsx';
import HeroIndicator from './HeroIndicator.jsx';
import styles from '../ProductHero.module.css';

export default function HeroStage({
  productName,
  imageSrc,
  imageCount,
  onNext,
  onPrev,
  themeClass,
}) {
  const [pulse, setPulse] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const touchStartRef = useRef(0);

  const triggerPulse = () => {
    setPulse(true);
    setHasInteracted(true);
    setTimeout(() => setPulse(false), 240);
  };

  const handleNext = () => {
    if (imageCount <= 1) return;
    onNext();
    triggerPulse();
  };

  const handlePrev = () => {
    if (imageCount <= 1) return;
    onPrev();
    triggerPulse();
  };

  const handleWheel = (e) => {
    if (imageCount <= 1) return;
    if (Math.abs(e.deltaY) > 20) {
      if (e.deltaY > 0) handleNext();
      else handlePrev();
    }
  };

  const handleTouchStart = (e) => {
    touchStartRef.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (imageCount <= 1) return;
    const diff = touchStartRef.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) handleNext();
      else handlePrev();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') handleNext();
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') handlePrev();
  };

  return (
    <div
      className={`${styles.heroStage} ${themeClass}`}
      onClick={handleNext}
      onWheel={handleWheel}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="region"
      aria-label="Product hero stage. Click or scroll to cycle views."
    >
      <HeroGradient />
      <HeroImage imageSrc={imageSrc} productName={productName} />
      {imageCount > 1 && (
        <HeroIndicator pulse={pulse} hasInteracted={hasInteracted} />
      )}
    </div>
  );
}
