import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="27 September 2026">
      <p>GuessTheBollySong is a daily music guessing game. This page explains what we collect and why.</p>
      <h2>What we store</h2>
      <ul>
        <li>An anonymous device identifier in a secure cookie, so your games and stats persist without an account.</li>
        <li>If you sign in: your email address, name and profile picture from Google (if you use Google), and your game history.</li>
        <li>If you become Premium: the email address and membership status Buy Me a Coffee sends us. We never see your payment details.</li>
        <li>Basic security logs, such as sign-in attempts, used to prevent abuse.</li>
      </ul>
      <h2>Advertising</h2>
      <p>
        Free players see ads served by Google AdSense. Google and its partners may use cookies to show ads based on your visits to
        this and other sites. Where required, you&apos;ll be asked for consent first, and you can change your choice at any time
        from the privacy settings link shown with the consent message. You can also manage ad personalisation at
        adssettings.google.com. Premium players are never shown ads and no advertising code is loaded for them.
      </p>
      <h2>How long we keep it</h2>
      <p>Game history is kept while your account exists. Delete your account by emailing us and we remove your data within 30 days.</p>
      <h2>Your choices</h2>
      <p>You can play without an account, clear the device cookie at any time, and ask us for a copy or deletion of your data.</p>
    </LegalPage>
  );
}
