"use client";

import { createContext, useContext } from "react";

// Whether this viewer should see ads is decided on the server (Premium and
// admins never do) and handed down once, so no client code can flip it on.
const AdsContext = createContext(false);

export function AdsProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <AdsContext.Provider value={enabled}>{children}</AdsContext.Provider>;
}

export function useAdsEnabled(): boolean {
  return useContext(AdsContext);
}
