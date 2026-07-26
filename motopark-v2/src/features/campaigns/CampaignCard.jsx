/**
 * features/campaigns/CampaignCard.jsx
 *
 * Campaign Experience System — Presentational card component.
 *
 * This is a PURE presentational component. It receives the campaign object and
 * callbacks (onDismiss, onCta) — it never touches context, storage, or the DOM
 * directly. The portal + animation wrapper lives in CampaignOverlay.jsx.
 *
 * Architecture note: `presentationType` routing lives in CampaignOverlay.
 * This component renders exactly the `floating_card` presentation. Future types
 * (strip, banner, fullscreen) would be separate sibling components.
 *
 * Design language: 100% MotoPark Design System V2 tokens. No new design primitives.
 *   - Ember background by default (`var(--mp-ember-900)`, overridable via `--campaign-bg`)
 *   - Sakana display font for the headline (`var(--font-display)`)
 *   - Existing Button primitive (variant="primary" / "ghost", onDark)
 *   - Flame gradient accent line — the brand signature from the old OfferBar
 *   - Orange badge token (`var(--badge-sale-bg)` / `var(--badge-sale-fg)`)
 */
import { useRef } from 'react';
import { Link } from 'react-router-dom';
import { X, Copy, Check, Tag, Clock } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import styles from './CampaignOverlay.module.css';
import { useState } from 'react';

/** Format a UTC date string into a human-readable countdown label. */
function formatExpiry(isoDate) {
  if (!isoDate) return null;
  const end = new Date(isoDate);
  const now = new Date();
  const diffMs = end - now;
  if (diffMs <= 0) return null;

  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Ends today';
  if (diffDays <= 7) return `Ends in ${diffDays} days`;
  return `Offer ends ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

/**
 * CampaignCard — the floating card layout.
 *
 * Props:
 *   campaign  — the active Campaign object
 *   onDismiss — called when the user closes the card
 *   isMobile  — when true renders the mobile-sheet layout
 *   closeRef  — ref forwarded to the close button for initial focus
 */
export default function CampaignCard({ campaign, onDismiss, isMobile = false, closeRef }) {
  const [copied, setCopied] = useState(false);
  const expiryLabel = formatExpiry(campaign.endDate);

  const imageSrc = isMobile
    ? (campaign.mobileImage || campaign.desktopImage)
    : (campaign.desktopImage || campaign.mobileImage);

  const copyCoupon = () => {
    if (!campaign.couponCode) return;
    navigator.clipboard?.writeText(campaign.couponCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Custom background override — only apply if non-default dark/light custom color provided
  const hasCustomBg = Boolean(
    campaign.bgColor &&
    campaign.bgColor !== '#ffffff' &&
    campaign.bgColor !== '#fff' &&
    campaign.bgColor !== 'white' &&
    campaign.bgColor !== 'transparent'
  );
  const cardStyle = hasCustomBg ? { '--campaign-custom-bg': campaign.bgColor } : undefined;

  return (
    <div
      className={`${styles.card} ${isMobile ? styles.cardMobile : styles.cardDesktop} ${hasCustomBg ? styles.cardCustomBg : ''}`}
      style={cardStyle}
      role="dialog"
      aria-modal="true"
      aria-labelledby="campaign-title"
    >
      {/* ── Close button (top-right) ──────────────────────── */}
      <button
        ref={closeRef}
        type="button"
        className={styles.closeBtn}
        onClick={onDismiss}
        aria-label="Dismiss campaign"
      >
        <X size={16} strokeWidth={2.2} aria-hidden="true" />
      </button>

      {/* ── Hero image ────────────────────────────────────── */}
      {imageSrc && (
        <div className={styles.imageWrap} aria-hidden="true">
          <img
            src={imageSrc}
            alt=""
            className={styles.image}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.imageScrim} />
        </div>
      )}

      {/* ── Content body ──────────────────────────────────── */}
      <div className={styles.body}>
        {/* Badge + eyebrow row */}
        <div className={styles.meta}>
          {campaign.badgeText && (
            <span className={styles.badge}>
              <Tag size={11} strokeWidth={2} aria-hidden="true" />
              {campaign.badgeText}
            </span>
          )}
          <span className={styles.eyebrow}>EST. 2020 · VIZAG</span>
        </div>

        {/* Headline */}
        <h2 id="campaign-title" className={styles.title}>
          {campaign.title}
        </h2>

        {/* Subtitle */}
        {campaign.subtitle && (
          <p className={styles.subtitle}>{campaign.subtitle}</p>
        )}

        {/* Coupon code chip */}
        {campaign.couponCode && (
          <button
            type="button"
            className={styles.coupon}
            onClick={copyCoupon}
            aria-label={`Copy coupon code ${campaign.couponCode}`}
            title="Click to copy"
          >
            <span className={styles.couponLabel}>CODE</span>
            <span className={styles.couponCode}>{campaign.couponCode}</span>
            <span className={styles.couponAction} aria-hidden="true">
              {copied
                ? <Check size={13} strokeWidth={2.5} />
                : <Copy size={13} strokeWidth={1.8} />
              }
            </span>
          </button>
        )}

        {/* CTAs */}
        <div className={styles.ctas}>
          <Button
            as={Link}
            to={campaign.ctaUrl}
            variant="primary"
            size={isMobile ? 'md' : 'sm'}
            className={styles.ctaBtn}
            onClick={onDismiss}
          >
            {campaign.ctaLabel || 'Shop Now'}
          </Button>
          <button
            type="button"
            className={styles.dismissBtn}
            onClick={onDismiss}
          >
            Maybe later
          </button>
        </div>

        {/* Expiry hint */}
        {expiryLabel && (
          <p className={styles.expiry}>
            <Clock size={12} strokeWidth={1.8} aria-hidden="true" />
            {expiryLabel}
          </p>
        )}
      </div>

      {/* ── Brand accent line (Flame gradient — brand signature) ─── */}
      <div className={styles.accentLine} aria-hidden="true" />
    </div>
  );
}
