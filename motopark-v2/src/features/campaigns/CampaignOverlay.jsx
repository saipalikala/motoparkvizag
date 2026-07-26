/**
 * features/campaigns/CampaignOverlay.jsx
 *
 * Campaign Experience System — Portal renderer, animation controller,
 * focus trap, and presentation-type router.
 *
 * Architecture:
 *   This component owns the "when and how" of showing a campaign. The "what"
 *   lives in CampaignCard (and future sibling presentation components).
 *
 *   Adding a new presentation type:
 *     1. Create e.g. CampaignStrip.jsx
 *     2. Add the case to PRESENTATION_MAP below
 *     3. Style it in CampaignOverlay.module.css
 *     No changes needed here or in the context.
 *
 * Rendering contract:
 *   - Only mounts on the homepage (pathname === '/')
 *   - Waits `campaign.displayDelayMs` before becoming visible
 *   - Uses a React portal into document.body — zero layout impact on the navbar/hero
 *   - Entry: opacity 0 + translateY(24px) scale(0.96) → 1 + 0 + 1
 *   - Exit:  reverse, then unmounts after animation completes
 *   - Escape key and backdrop click dismiss the card
 *   - Focus is trapped inside the card while visible
 *   - GPU-only animations (transform + opacity) — never triggers layout
 */
import { createPortal } from 'react-dom';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useCampaign } from './CampaignContext.jsx';
import CampaignCard from './CampaignCard.jsx';
import CampaignOfferBar from './CampaignOfferBar.jsx';
import CampaignStoryBand from './CampaignStoryBand.jsx';
import CampaignHeroBanner from './CampaignHeroBanner.jsx';
import styles from './CampaignOverlay.module.css';

/** Map presentationType → component. Full presentation engine support. */
const PRESENTATION_MAP = {
  floating_card: CampaignCard,
  offer_bar:     CampaignOfferBar,
  story_band:    CampaignStoryBand,
  homepage_hero: CampaignHeroBanner,
};

/** Detect mobile breakpoint without a media query listener (sufficient for mount-time). */
function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

export default function CampaignOverlay() {
  const { campaign, isDismissed, dismiss, ready } = useCampaign();
  const { pathname } = useLocation();

  // 'hidden'   — waiting for delay or not eligible
  // 'entering' — mounted, animation playing
  // 'visible'  — fully visible, idle
  // 'exiting'  — exit animation playing
  const [phase, setPhase] = useState('hidden');
  const [isMobile, setIsMobile] = useState(false);

  const closeBtnRef = useRef(null);
  const overlayRef  = useRef(null);
  const timerRef    = useRef(null);

  const isHome = pathname === '/';

  // Decide whether to show at all
  const shouldShow = ready && isHome && campaign && !isDismissed;

  // Delay → enter
  useEffect(() => {
    if (!shouldShow) {
      setPhase('hidden');
      return;
    }
    setIsMobile(isMobileViewport());
    timerRef.current = setTimeout(() => {
      setPhase('entering');
    }, campaign.displayDelayMs ?? 1500);

    return () => clearTimeout(timerRef.current);
  }, [shouldShow, campaign?.displayDelayMs]);

  // entering → visible (after CSS animation duration)
  useEffect(() => {
    if (phase !== 'entering') return;
    const t = setTimeout(() => setPhase('visible'), 420); // matches --dur-slow + buffer
    return () => clearTimeout(t);
  }, [phase]);

  // Focus the close button when the card becomes visible
  useEffect(() => {
    if (phase === 'visible' || phase === 'entering') {
      // Delay slightly so the element is painted
      const t = setTimeout(() => closeBtnRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [phase]);

  // Escape key to dismiss
  useEffect(() => {
    if (phase === 'hidden' || phase === 'exiting') return;
    const onKey = (e) => { if (e.key === 'Escape') handleDismiss(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // Focus trap — Tab cycles within the card
  useEffect(() => {
    if (phase !== 'visible' && phase !== 'entering') return;
    const onTab = (e) => {
      if (e.key !== 'Tab' || !overlayRef.current) return;
      const focusable = overlayRef.current.querySelectorAll(
        'a[href], button:not([disabled]), input, [tabindex]:not([tabindex="-1"])',
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last  = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onTab);
    return () => document.removeEventListener('keydown', onTab);
  }, [phase]);

  const handleDismiss = useCallback(() => {
    setPhase('exiting');
    // Wait for exit animation then commit the dismiss to context/storage
    setTimeout(() => {
      dismiss();
      setPhase('hidden');
    }, 220); // matches exit animation duration
  }, [dismiss]);

  // Nothing to render
  if (phase === 'hidden' || !campaign) return null;

  // Resolve the correct presentation component
  const PresentationComponent = PRESENTATION_MAP[campaign.presentationType] ?? CampaignCard;

  const isOfferBar = campaign.presentationType === 'offer_bar';
  const isCentered = campaign.presentationType === 'story_band' || campaign.presentationType === 'homepage_hero';

  const overlayClass = [
    styles.overlay,
    isOfferBar
      ? styles.overlayTopBar
      : isCentered
      ? styles.overlayCenter
      : isMobile
      ? styles.overlayMobile
      : styles.overlayDesktop,
    phase === 'entering' ? styles.entering : '',
    phase === 'visible'  ? styles.visible  : '',
    phase === 'exiting'  ? styles.exiting  : '',
  ].filter(Boolean).join(' ');

  return createPortal(
    <>
      {/* Backdrop — dims the page while card is open */}
      <div
        className={`${styles.backdrop} ${phase === 'exiting' ? styles.backdropExit : ''}`}
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Card wrapper — handles positioning + animation */}
      <div
        ref={overlayRef}
        className={overlayClass}
        aria-live="polite"
      >
        <PresentationComponent
          campaign={campaign}
          onDismiss={handleDismiss}
          isMobile={isMobile}
          closeRef={closeBtnRef}
        />
      </div>
    </>,
    document.body,
  );
}
