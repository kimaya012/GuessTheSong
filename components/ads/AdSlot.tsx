"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    adsbygoogle?: unknown[];
  }
}

interface AdSlotProps {
  slotId: string;
  className?: string;
}

// Thin, togglable wrapper: renders nothing until an AdSense publisher id is
// configured, so ad markup doesn't ship before the account is approved.
// Each mounted unit has to be individually pushed to the adsbygoogle queue —
// the global script tag (loaded once in the root layout) only sets up the
// library, it doesn't auto-initialize units added by client-side navigation.
export function AdSlot({ slotId, className }: AdSlotProps) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const insRef = useRef<HTMLModElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!clientId || pushed.current) return;
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
      pushed.current = true;
    } catch {
      // AdSense script hasn't loaded yet or blocked (ad blocker) — silently
      // skip, the slot just stays empty.
    }
  }, [clientId]);

  if (!clientId) return null;

  return (
    <div className={className} data-ad-slot={slotId}>
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  );
}
