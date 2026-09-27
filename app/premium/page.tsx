import type { Metadata } from "next";
import Link from "next/link";
import { Check, Crown, Minus } from "lucide-react";
import { getViewer } from "@/lib/viewer";
import { ARCHIVE_FREE_DAYS, can } from "@/lib/authz/policy";
import { env } from "@/lib/env";
import { getActiveEntitlement } from "@/lib/services/entitlements";

export const metadata: Metadata = { title: "Premium" };

const PERKS: { label: string; free: string | boolean; premium: string | boolean }[] = [
  { label: "Today's song", free: true, premium: true },
  { label: "Archive", free: `Last ${ARCHIVE_FREE_DAYS} days`, premium: "Every past song" },
  { label: "Stats saved to your account", free: true, premium: true },
  { label: "Stats by decade and mood", free: false, premium: true },
  { label: "Ads", free: "Shown", premium: "None, ever" },
  { label: "Crown on your share card", free: false, premium: true },
];

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Check className="mx-auto h-5 w-5 text-mint" aria-label="Included" />;
  if (value === false) return <Minus className="mx-auto h-5 w-5 text-muted-foreground/50" aria-label="Not included" />;
  return <span>{value}</span>;
}

export default async function PremiumPage() {
  const viewer = await getViewer();
  const membershipUrl = env().NEXT_PUBLIC_BMC_MEMBERSHIP_URL;
  const isPremium = can(viewer, "archive:full") && viewer.plan === "premium";
  const entitlement = viewer.userId && isPremium ? await getActiveEntitlement(viewer.userId) : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Crown className="h-10 w-10 text-marigold" />
      <h1 className="mt-3 font-display text-5xl sm:text-6xl">Premium listener</h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Play every song we&apos;ve ever run, without ads, and see which eras you really know. Paid monthly through Buy Me a
        Coffee, cancel whenever you like.
      </p>

      {isPremium ? (
        <div className="panel mt-8 rounded-3xl p-6">
          <p className="text-lg font-semibold text-marigold">You&apos;re Premium. Thank you for supporting the game.</p>
          {entitlement && (
            <p className="mt-2 text-muted-foreground">
              {entitlement.status === "cancelled" ? "Your membership ends" : "Current period runs until"}{" "}
              {entitlement.currentPeriodEnd.toLocaleDateString("en-IN", { dateStyle: "long" })}.
            </p>
          )}
        </div>
      ) : (
        <div className="panel mt-8 rounded-3xl p-6">
          <h2 className="text-lg font-semibold">How to upgrade</h2>
          <ol className="mt-4 grid gap-3 text-foreground/90">
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marigold/15 text-xs font-bold text-marigold">1</span>
              {viewer.userId ? (
                <span>
                  You&apos;re signed in as <span className="font-semibold">{viewer.email}</span>.
                </span>
              ) : (
                <span>
                  <Link href="/sign-in?next=/premium" className="font-semibold text-peacock underline">
                    Sign in
                  </Link>{" "}
                  so we know whose account to upgrade.
                </span>
              )}
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marigold/15 text-xs font-bold text-marigold">2</span>
              <span>Join the Premium membership on Buy Me a Coffee using the same email address.</span>
            </li>
            <li className="flex gap-3">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marigold/15 text-xs font-bold text-marigold">3</span>
              <span>
                Come back here. Premium switches on within a few seconds. Paid with another email?{" "}
                <Link href="/account" className="font-semibold text-peacock underline">
                  Link it on your account page
                </Link>
                .
              </span>
            </li>
          </ol>
          {membershipUrl ? (
            <a
              href={membershipUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-12 items-center rounded-full bg-marigold px-6 font-bold text-primary-foreground shadow-[0_10px_40px_-10px_rgb(255_176_32/0.7)]"
            >
              Join on Buy Me a Coffee
            </a>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Memberships open soon.</p>
          )}
        </div>
      )}

      <div className="panel mt-6 overflow-x-auto rounded-3xl">
        <table className="w-full min-w-[480px] text-sm">
          <caption className="sr-only">Free and Premium compared</caption>
          <thead>
            <tr className="text-left">
              <th scope="col" className="p-4 font-semibold text-muted-foreground">What you get</th>
              <th scope="col" className="w-32 p-4 text-center font-semibold">Free</th>
              <th scope="col" className="w-36 p-4 text-center font-semibold text-marigold">Premium</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/6">
            {PERKS.map((perk) => (
              <tr key={perk.label}>
                <th scope="row" className="p-4 text-left font-medium">{perk.label}</th>
                <td className="p-4 text-center text-muted-foreground"><Cell value={perk.free} /></td>
                <td className="p-4 text-center"><Cell value={perk.premium} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
