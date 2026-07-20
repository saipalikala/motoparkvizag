import { Monitor, Smartphone } from 'lucide-react';
import styles from './HeroCarouselPreview.module.css';

/**
 * HeroCarouselPreview — live, in-form preview of the slide being authored.
 *
 * This is the one genuinely new admin capability relative to Campaigns (which
 * has no live preview, only a static uploaded-file thumbnail). It is a
 * self-contained approximation built from design tokens directly — NOT the
 * real storefront HeroCarouselSlide component, which doesn't exist yet
 * (that's a later phase, storefront-facing). When it's built, this preview
 * can be reconciled with it or left as-is; that's a future decision, not one
 * this component needs to make now.
 *
 * Purely presentational: reacts to `model` (the form's current in-memory
 * state), never fetches, never persists.
 */
export default function HeroCarouselPreview({ model, mode, onModeChange }) {
  const isMobile = mode === 'mobile';
  const image = isMobile ? model.mobileImage || model.desktopImage : model.desktopImage;
  const isEmpty = !model.headline.trim() && !image;

  const scrimStyle = {
    '--preview-overlay': model.overlayOpacity ?? 0.6,
  };

  return (
    <section className={styles.wrap} aria-label="Slide preview">
      <div className={styles.head}>
        <h2 className={styles.title}>Preview</h2>
        <div className={styles.modeToggle} role="group" aria-label="Preview breakpoint">
          <button
            type="button"
            className={`${styles.modeBtn} ${!isMobile ? styles.modeBtnActive : ''}`}
            onClick={() => onModeChange('desktop')}
            aria-pressed={!isMobile}
          >
            <Monitor size={14} aria-hidden="true" /> Desktop
          </button>
          <button
            type="button"
            className={`${styles.modeBtn} ${isMobile ? styles.modeBtnActive : ''}`}
            onClick={() => onModeChange('mobile')}
            aria-pressed={isMobile}
          >
            <Smartphone size={14} aria-hidden="true" /> Mobile
          </button>
        </div>
      </div>

      <div
        className={`${styles.stage} ${isMobile ? styles.stageMobile : styles.stageDesktop} ${
          model.theme === 'light' ? styles.themeLight : styles.themeDark
        }`}
        style={scrimStyle}
        aria-hidden="true"
      >
        {isEmpty ? (
          <p className={styles.placeholder}>Add a headline and image to see a preview</p>
        ) : (
          <>
            {image && (
              <img
                className={styles.photo}
                src={image}
                alt=""
                style={{
                  objectPosition: `${model.imageFocalPoint?.x ?? 50}% ${model.imageFocalPoint?.y ?? 50}%`,
                }}
              />
            )}
            <div className={styles.scrim} />
            <div className={styles.copy}>
              {model.headline && <p className={styles.headline}>{model.headline}</p>}
              {model.subtitle && <p className={styles.subtitle}>{model.subtitle}</p>}
              <div className={styles.ctas}>
                {model.primaryCta?.label && <span className={styles.ctaPrimary}>{model.primaryCta.label}</span>}
                {model.secondaryCta?.label && <span className={styles.ctaSecondary}>{model.secondaryCta.label}</span>}
              </div>
            </div>
          </>
        )}
      </div>

      <p className={styles.note}>
        Approximate — for the exact rendered page,{' '}
        <a href="/" target="_blank" rel="noopener noreferrer">open the homepage in a new tab</a>{' '}
        once this slide is enabled.
      </p>
    </section>
  );
}
