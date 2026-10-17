import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/viewer";

export const metadata: Metadata = { title: "Your account" };

export default async function AccountPage() {
  const viewer = await getViewer();
  if (!viewer.userId) redirect("/sign-in?next=/account");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10">
      <h1 className="font-display text-5xl">Your account</h1>
      <p className="mt-2 text-muted-foreground">Signed in as {viewer.email}</p>

      <section className="panel mt-8 rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Your games</h2>
        <p className="mt-2 text-muted-foreground">
          Your streak and stats follow you to every device you sign in on.
        </p>
        <Link href="/stats" className="mt-4 inline-flex rounded-full bg-marigold px-5 py-2.5 font-bold text-primary-foreground">
          See your stats
        </Link>
      </section>
    </main>
  );
}
