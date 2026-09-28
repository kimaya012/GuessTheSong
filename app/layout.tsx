import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { headers } from "next/headers";
import { Manrope, Rozha_One } from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { StageBackground } from "@/components/stage/StageBackground";
import { AdsProvider } from "@/components/ads/AdsProvider";
import { getViewer } from "@/lib/viewer";
import { can } from "@/lib/authz/policy";
import "./globals.css";

const body = Manrope({ variable: "--font-body", subsets: ["latin"] });
const display = Rozha_One({ variable: "--font-display", weight: "400", subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "GuessTheBollySong — the daily Bollywood song game",
    template: "%s · GuessTheBollySong",
  },
  description:
    "Hear a split second of a Bollywood song and name it in six tries. A new song every day, with an archive of past puzzles.",
};

export const viewport: Viewport = {
  themeColor: "#0b0716",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [viewer, headerList] = await Promise.all([getViewer(), headers()]);
  const nonce = headerList.get("x-nonce") ?? undefined;
  const adsenseClientId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  // Premium listeners and admins never download ad code at all.
  const showAds = !!adsenseClientId && !can(viewer, "ads:none");

  return (
    <html lang="en" className={`${body.variable} ${display.variable} h-full`}>
      <body className="flex min-h-full flex-col">
        {showAds && (
          <Script
            async
            nonce={nonce}
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${adsenseClientId}`}
            crossOrigin="anonymous"
            strategy="afterInteractive"
          />
        )}
        <StageBackground />
        <AdsProvider enabled={showAds}>
          <SiteHeader />
          <div className="flex flex-1 flex-col">{children}</div>
          <SiteFooter />
        </AdsProvider>
      </body>
    </html>
  );
}
