/**
 * features/campaigns/CampaignOfferBar.jsx
 *
 * Campaign Experience System — Top Offer Bar presentation type.
 * Renders a sticky/fixed top announcement bar across the header area.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Copy, Check, Tag } from 'lucide-react';
import Button from '@/components/ui/Button.jsx';
import styles from './CampaignOverlay.module.css';

export default function CampaignOfferBar({ campaign, onDismiss, isMobile = false, closeRef }) {
  const [copied, setCopied] = useState(false);

  const copyCoupon = () => {
    if (!campaign.couponCode) return;
    navigator.clipboard?.writeText(campaign.couponCode).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={styles.offerBar}
      role="region"
      aria-label="Promotional offer bar"
    >
      <div className={`container ${styles.offerBarContent}`}>
        {/* Left / Main info */}
        <div className={styles.offerBarInfo}>
          {campaign.badgeText && (
            <span className={styles.badge}>
              <Tag size={10} strokeWidth={2} aria-hidden="true" />
              {campaign.badgeText}
            </span>
          )}
          <span className={styles.offerBarTitle}>{campaign.title}</span>
          {!isMobile && campaign.subtitle && (
            <span className={styles.offerBarSubtitle}>— {campaign.subtitle}</span>
          )}
        </div>

        {/* Coupon code chip */}
        {campaign.couponCode && (
          <button
            type="button"
            className={styles.couponSmall}
            onClick={copyCoupon}
            title="Click to copy coupon"
          >
            <span className={styles.couponCode}>{campaign.couponCode}</span>
            <span className={styles.couponAction}>
              {copied ? <Check size={12} strokeWidth={2.5} /> : <Copy size={12} strokeWidth={1.8} />}
            </span>
          </button>
        )}

        {/* CTA Button */}
        <Button
          as={Link}
          to={campaign.ctaUrl}
          variant="primary"
          size="sm"
          className={styles.offerBarCta}
          onClick={onDismiss}
        >
          {campaign.ctaLabel || 'Claim Offer'}
        </Button>

        {/* Close button */}
        <button
          ref={closeRef}
          type="button"
          className={styles.offerBarClose}
          onClick={onDismiss}
          aria-label="Dismiss offer bar"
        >
          <X size={15} strokeWidth={2} />
        </button>
      </div>

      {/* Flame accent line at bottom */}
      <div className={styles.accentLine} aria-hidden="true" />
    </div>
  );
}
