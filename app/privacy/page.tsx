import type { Metadata } from "next";
import { LegalPage } from "@/components/layout/LegalPage";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  const contact = env().NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <LegalPage title="Privacy policy" updated="17 October 2026">
      <p>GuessTheBollySong is a daily music guessing game. This page explains what we collect and why.</p>
      <h2>What we store</h2>
      <ul>
        <li>An anonymous device identifier in a secure cookie, so your games and stats persist without an account.</li>
        <li>If you sign in: your email address, and your name and profile picture from Google if you use Google, plus your game history.</li>
        <li>Basic security logs, such as sign-in attempts, used to prevent abuse.</li>
      </ul>
      <h2>Advertising</h2>
      <p>
        The game is free and supported by ads served by Google AdSense. Google and its partners may use cookies to show
        ads based on your visits to this and other sites. Where required, you will be asked for consent first, and you
        can change your choice at any time from the privacy settings link shown with the consent message. You can also
        manage ad personalisation at adssettings.google.com.
      </p>
      <h2>How long we keep it</h2>
      <p>
        Game history is kept while your account exists.
        {contact
          ? ` To delete your account and data, email ${contact} and we will remove it within 30 days.`
          : " You can ask us to delete your account and data and we will remove it within 30 days."}
      </p>
      <h2>Your choices</h2>
      <p>You can play without an account, clear the device cookie at any time, and ask us for a copy or deletion of your data.</p>
    </LegalPage>
  );
}
