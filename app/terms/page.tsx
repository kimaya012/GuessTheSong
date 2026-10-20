import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  const contact = env().NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <LegalPage title="Terms of use" updated="17 October 2026">
      <p>By playing GuessTheBollySong you agree to these terms.</p>
      <h2>The game</h2>
      <p>
        The game is free and provided as is. We may change puzzles, rules or features, and a daily puzzle may
        occasionally be replaced if its audio becomes unavailable.
      </p>
      <h2>Fair play</h2>
      <ul>
        <li>Do not try to access puzzles, answers or accounts that are not yours, or to disrupt the service.</li>
        <li>Automated play and scraping are not allowed.</li>
        <li>Names and other content you submit must not be abusive or unlawful, and we may remove them.</li>
      </ul>
      <h2>Advertising</h2>
      <p>The service is supported by advertising. See the privacy policy for how ads and cookies are handled.</p>
      <h2>Music</h2>
      <p>
        Audio previews are streamed from licensed third-party sources and belong to their rights holders. Rights holders
        who want content removed
        {contact ? ` can email ${contact}` : " can contact us"} and we will act promptly.
      </p>
    </LegalPage>
  );
}
