"use client";

import { useEffect, useRef } from "react";
import { useAdsEnabled } from "./AdsProvider";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

type Placement = "result" | "archive" | "stats";

const SLOT_IDS: Record<Placement, string | undefined> = {
  result: process.env.NEXT_PUBLIC_ADSENSE_SLOT_RESULT,
  archive: process.env.NEXT_PUBLIC_ADSENSE_SLOT_ARCHIVE,
  stats: process.env.NEXT_PUBLIC_ADSENSE_SLOT_STATS,
};

// Renders nothing for ad-free viewers or before AdSense is configured.
// Reserves its height up front so the ad loading in doesn't shift layout.
export function AdSlot({ placement, className }: { placement: Placement; className?: string }) {
  const enabled = useAdsEnabled();
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const slotId = SLOT_IDS[placement];
  const pushed = useRef(false);

  useEffect(() => {
    if (!enabled || !clientId || !slotId || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // Blocked or not loaded yet — the reserved space simply stays empty.
    }
  }, [enabled, clientId, slotId]);

  if (!enabled || !clientId || !slotId) return null;

  return (
    <aside aria-label="Advertisement" className={className}>
      <p className="mb-1 text-center text-[11px] text-muted-foreground/70">Advertisement</p>
      <ins
        className="adsbygoogle block min-h-[100px] overflow-hidden rounded-xl"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </aside>
  );
}
