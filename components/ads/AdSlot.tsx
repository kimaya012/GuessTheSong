interface AdSlotProps {
  slotId: string;
  className?: string;
}

// Thin, togglable wrapper: renders nothing until an AdSense publisher id is
// configured, so ad markup doesn't ship before the account is approved.
export function AdSlot({ slotId, className }: AdSlotProps) {
  const clientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  if (!clientId) return null;

  return (
    <div className={className} data-ad-slot={slotId}>
      <ins
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
