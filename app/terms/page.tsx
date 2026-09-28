import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="27 September 2026">
      <p>By playing GuessTheBollySong you agree to these terms.</p>
      <h2>The game</h2>
      <p>The game is provided as is. We may change puzzles, rules or features, and a daily puzzle may occasionally be replaced if its audio becomes unavailable.</p>
      <h2>Fair play</h2>
      <ul>
        <li>Don&apos;t attempt to access puzzles, answers or accounts that aren&apos;t yours, or to disrupt the service.</li>
        <li>Automated play and scraping are not allowed.</li>
      </ul>
      <h2>Premium</h2>
      <p>
        Premium is a monthly membership sold through Buy Me a Coffee under their terms. Access lasts until the end of the period
        you paid for, including after you cancel. We may suspend Premium for accounts that break these terms.
      </p>
      <h2>Music</h2>
      <p>Audio previews are streamed from licensed third-party sources and belong to their rights holders. Rights holders can contact us to have content removed.</p>
    </LegalPage>
  );
}
