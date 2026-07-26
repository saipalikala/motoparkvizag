/**
 * features/campaigns/CampaignHeroBanner.jsx
 *
 * Campaign Experience System — Homepage Hero Banner presentation type.
 * Renders a full-width hero announcement banner with rich typography.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Copy, Check, Tag, Sparkles } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import styles from './CampaignOverlay.module.css';

export default function CampaignHeroBanner({ campaign, onDismiss, isMobile = false, closeRef }) {
  const [copied, setCopied] = useState(false);
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
      className={styles.heroBannerCard}
      role="dialog"
      aria-modal="true"
      aria-labelledby="herobanner-title"
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

      {imageSrc && (
        <div className={styles.heroBannerImageWrap}>
          <img
            src={imageSrc}
            alt=""
            className={styles.image}
            loading="lazy"
            decoding="async"
          />
          <div className={styles.heroBannerScrim} />
        </div>
      )}

      <div className={styles.heroBannerBody}>
        <div className={styles.meta}>
          {campaign.badgeText ? (
            <span className={styles.badge}>
              <Tag size={11} strokeWidth={2} aria-hidden="true" />
              {campaign.badgeText}
            </span>
          ) : (
            <span className={styles.badge}>
              <Sparkles size={11} strokeWidth={2} aria-hidden="true" />
              SPOTLIGHT
            </span>
          )}
          <span className={styles.eyebrow}>MOTOPARK EXCLUSIVE</span>
        </div>

        <h2 id="herobanner-title" className={styles.heroBannerTitle}>
          {campaign.title}
        </h2>

        {campaign.subtitle && (
          <p className={styles.heroBannerSubtitle}>{campaign.subtitle}</p>
        )}

        <div className={styles.heroBannerRow}>
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

          <Button
            as={Link}
            to={campaign.ctaUrl}
            variant="primary"
            size={isMobile ? 'md' : 'lg'}
            onClick={onDismiss}
          >
            {campaign.ctaLabel || 'Explore Offer'}
          </Button>

          <button type="button" className={styles.dismissBtn} onClick={onDismiss}>
            Maybe later
          </button>
        </div>
      </div>

      <div className={styles.accentLine} aria-hidden="true" />
    </div>
  );
}
