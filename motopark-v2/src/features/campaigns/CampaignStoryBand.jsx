/**
 * features/campaigns/CampaignStoryBand.jsx
 *
 * Campaign Experience System — Story Band Showcase presentation type.
 * Renders a wide editorial showcase card modal centered on the screen.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Copy, Check, Tag, Clock } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import styles from './CampaignOverlay.module.css';

function formatExpiry(isoDate) {
  if (!isoDate) return null;
  const end = new Date(isoDate);
  const diffMs = end - Date.now();
  if (diffMs <= 0) return null;
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 1) return 'Ends today';
  if (diffDays <= 7) return `Ends in ${diffDays} days`;
  return `Offer ends ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

export default function CampaignStoryBand({ campaign, onDismiss, isMobile = false, closeRef }) {
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

  return (
    <div
      className={styles.storyBandCard}
      role="dialog"
      aria-modal="true"
      aria-labelledby="storyband-title"
    >
      <button
        ref={closeRef}
        type="button"
        className={styles.closeBtn}
        onClick={onDismiss}
        aria-label="Dismiss campaign"
      >
        <X size={16} strokeWidth={2.2} />
      </button>

      <div className={styles.storyBandGrid}>
        {imageSrc && (
          <div className={styles.storyBandImageWrap}>
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

        <div className={styles.body}>
          <div className={styles.meta}>
            {campaign.badgeText && (
              <span className={styles.badge}>
                <Tag size={11} strokeWidth={2} aria-hidden="true" />
                {campaign.badgeText}
              </span>
            )}
            <span className={styles.eyebrow}>FEATURED STORY · VIZAG</span>
          </div>

          <h2 id="storyband-title" className={styles.title}>
            {campaign.title}
          </h2>

          {campaign.subtitle && (
            <p className={styles.subtitle}>{campaign.subtitle}</p>
          )}

          {campaign.couponCode && (
            <button
              type="button"
              className={styles.coupon}
              onClick={copyCoupon}
              title="Click to copy coupon"
            >
              <span className={styles.couponLabel}>CODE</span>
              <span className={styles.couponCode}>{campaign.couponCode}</span>
              <span className={styles.couponAction}>
                {copied ? <Check size={13} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={1.8} />}
              </span>
            </button>
          )}

          <div className={styles.ctas}>
            <Button
              as={Link}
              to={campaign.ctaUrl}
              variant="primary"
              size={isMobile ? 'md' : 'sm'}
              onClick={onDismiss}
            >
              {campaign.ctaLabel || 'Explore Story'}
            </Button>
            <button type="button" className={styles.dismissBtn} onClick={onDismiss}>
              Maybe later
            </button>
          </div>

          {expiryLabel && (
            <p className={styles.expiry}>
              <Clock size={12} strokeWidth={1.8} />
              {expiryLabel}
            </p>
          )}
        </div>
      </div>

      <div className={styles.accentLine} aria-hidden="true" />
    </div>
  );
}
