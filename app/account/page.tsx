import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown } from "lucide-react";
import { getViewer } from "@/lib/viewer";
import { getActiveEntitlement } from "@/lib/services/entitlements";
import { listLinkedEmails } from "@/lib/services/linked-emails";
import { removeLinkedEmailAction } from "./actions";
import { LinkEmailForm } from "@/components/account/LinkEmailForm";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ linked?: string }> }) {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/sign-in?next=/account");
  const [entitlement, linked, { linked: linkedStatus }] = await Promise.all([
    getActiveEntitlement(viewer.userId),
    listLinkedEmails(viewer.userId),
    searchParams,
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="font-display text-5xl">Your account</h1>
      <p className="mt-2 text-muted-foreground">Signed in as {viewer.email}</p>

      {linkedStatus === "ok" && (
        <p role="status" className="mt-6 rounded-xl bg-mint/10 px-4 py-3 text-mint ring-1 ring-mint/30">
          Email confirmed. Any membership paid with it now counts toward your account.
        </p>
      )}
      {linkedStatus === "invalid" && (
        <p role="alert" className="mt-6 rounded-xl bg-rani/10 px-4 py-3 text-rani ring-1 ring-rani/30">
          That confirmation link is invalid or has expired. Send a new one below.
        </p>
      )}

      <section className="panel mt-8 rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Plan</h2>
        {entitlement ? (
          <p className="mt-2 flex flex-wrap items-center gap-2">
            <Crown className="h-5 w-5 text-marigold" />
            <span className="font-semibold text-marigold">Premium</span>
            <span className="text-muted-foreground">
              {entitlement.status === "cancelled" ? "ends" : "renews"} on{" "}
              {entitlement.currentPeriodEnd.toLocaleDateString("en-IN", { dateStyle: "long" })}
            </span>
          </p>
        ) : (
          <p className="mt-2 text-muted-foreground">
            Free.{" "}
            <Link href="/premium" className="font-semibold text-peacock underline">
              See what Premium adds
            </Link>
          </p>
        )}
      </section>

      <section className="panel mt-6 rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Paid with a different email?</h2>
        <p className="mb-4 mt-1 text-sm text-muted-foreground">
          Add the address you used on Buy Me a Coffee. We&apos;ll email it a confirmation link, and once you confirm, the
          membership unlocks Premium here.
        </p>
        {linked.length > 0 && (
          <ul className="mb-4 grid gap-2">
            {linked.map((l) => (
              <li key={l.id} className="flex items-center justify-between gap-3 rounded-xl bg-white/5 px-4 py-3 text-sm ring-1 ring-white/8">
                <span className="truncate">{l.email}</span>
                <span className="flex shrink-0 items-center gap-3">
                  <span className={l.verifiedAt ? "text-mint" : "text-muted-foreground"}>{l.verifiedAt ? "Confirmed" : "Waiting for confirmation"}</span>
                  <form action={removeLinkedEmailAction}>
                    <input type="hidden" name="id" value={l.id} />
                    <button type="submit" className="font-semibold text-muted-foreground hover:text-rani">
                      Remove
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
        <LinkEmailForm />
      </section>
    </main>
  );
}
