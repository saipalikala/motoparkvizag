import { useState, useEffect, useRef } from 'react';
import styles from './PriceSlider.module.css';

/**
 * PriceSlider — Tactile dual-range price slider component.
 *
 * Provides real-time visual feedback and dual thumb dragging
 * using native range inputs over a custom CSS track.
 */
export default function PriceSlider({ min = 0, max = 50000, minVal = 0, maxVal = 50000, onChange }) {
  const [minPrice, setMinPrice] = useState(minVal);
  const [maxPrice, setMaxPrice] = useState(maxVal);
  const minRef = useRef(minVal);
  const maxRef = useRef(maxVal);

  useEffect(() => {
    setMinPrice(minVal);
    minRef.current = minVal;
  }, [minVal]);

  useEffect(() => {
    setMaxPrice(maxVal);
    maxRef.current = maxVal;
  }, [maxVal]);

  const handleMinChange = (e) => {
    const value = Math.min(Number(e.target.value), maxPrice - 100);
    setMinPrice(value);
    minRef.current = value;
    if (onChange) onChange({ min: value, max: maxPrice });
  };

  const handleMaxChange = (e) => {
    const value = Math.max(Number(e.target.value), minPrice + 100);
    setMaxPrice(value);
    maxRef.current = value;
    if (onChange) onChange({ min: minPrice, max: value });
  };

  // Convert to percentages for track fill
  const minPercent = Math.max(0, Math.min(100, ((minPrice - min) / (max - min)) * 100));
  const maxPercent = Math.max(0, Math.min(100, ((maxPrice - min) / (max - min)) * 100));

  return (
    <div className={styles.container}>
      <div className={styles.sliderTrack}>
        <div
          className={styles.rangeFill}
          style={{
            left: `${minPercent}%`,
            width: `${Math.max(0, maxPercent - minPercent)}%`,
          }}
        />
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={100}
        value={minPrice}
        onChange={handleMinChange}
        className={`${styles.thumb} ${styles.thumbLeft}`}
        aria-label="Minimum price range slider"
      />

      <input
        type="range"
        min={min}
        max={max}
        step={100}
        value={maxPrice}
        onChange={handleMaxChange}
        className={`${styles.thumb} ${styles.thumbRight}`}
        aria-label="Maximum price range slider"
      />
    </div>
  );
}
