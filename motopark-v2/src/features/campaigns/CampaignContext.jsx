/**
 * features/campaigns/CampaignContext.jsx
 *
 * Campaign Experience System — React context.
 *
 * Responsibilities:
 *   1. Fetch the highest-priority active campaign (via services/campaigns.js).
 *   2. Enforce dismiss behaviour: session / daily / campaign / always.
 *   3. Expose { campaign, isDismissed, dismiss } to the overlay.
 *
 * Dismiss key strategy (per dismissBehaviour):
 *   'session'   → sessionStorage: 'mp-c-{id}' = '1'          resets on tab/browser close
 *   'daily'     → localStorage:   'mp-c-{id}' = ISO date      resets after midnight
 *   'campaign'  → localStorage:   'mp-c-{id}' = '1'           persists until campaign id changes
 *   'always'    → never stores anything — shows every time
 *
 * The context only mounts/fetches when the storefront shell renders; the Admin
 * realm never imports this file.
 */
import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getActiveCampaign } from '@/services/campaigns.js';

const CampaignContext = createContext(null);

// ── Storage helpers ────────────────────────────────────────────────────────

function storageKey(id) {
  return `mp-c-${id}`;
}

function readDismissed(campaign) {
  if (!campaign) return false;
  const key = storageKey(campaign._id);
  const behaviour = campaign.dismissBehaviour;

  try {
    if (behaviour === 'session') {
      return sessionStorage.getItem(key) === '1';
    }
    if (behaviour === 'daily') {
      const stored = localStorage.getItem(key);
      if (!stored) return false;
      // Dismissed today already?
      return new Date(stored).toDateString() === new Date().toDateString();
    }
    if (behaviour === 'campaign') {
      return localStorage.getItem(key) === '1';
    }
    // 'always' — never persisted, always shows
    return false;
  } catch {
    return false;
  }
}

function writeDismissed(campaign) {
  if (!campaign) return;
  const key = storageKey(campaign._id);
  const behaviour = campaign.dismissBehaviour;

  try {
    if (behaviour === 'session') {
      sessionStorage.setItem(key, '1');
    } else if (behaviour === 'daily') {
      localStorage.setItem(key, new Date().toISOString());
    } else if (behaviour === 'campaign') {
      localStorage.setItem(key, '1');
    }
    // 'always' — store nothing
  } catch {
    /* storage unavailable — no-op */
  }
}

// ── Provider ───────────────────────────────────────────────────────────────

export function CampaignProvider({ children }) {
  const [campaign, setCampaign] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    getActiveCampaign().then((c) => {
      if (!alive) return;
      setCampaign(c);
      setDismissed(readDismissed(c));
      setReady(true);
    });
    return () => { alive = false; };
  }, []);

  const dismiss = useCallback(() => {
    writeDismissed(campaign);
    setDismissed(true);
  }, [campaign]);

  return (
    <CampaignContext.Provider value={{ campaign, isDismissed: dismissed, dismiss, ready }}>
      {children}
    </CampaignContext.Provider>
  );
}

/** Consume campaign state — only used by CampaignOverlay. */
export function useCampaign() {
  const ctx = useContext(CampaignContext);
  if (!ctx) throw new Error('useCampaign must be used within <CampaignProvider>');
  return ctx;
}
