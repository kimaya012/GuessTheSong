import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SignInForm } from "@/components/auth/SignInForm";
import { getViewer } from "@/lib/viewer";
import { env } from "@/lib/env";
import { safeNextPath } from "@/lib/safe-redirect";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNextPath((await searchParams).next);
  const viewer = await getViewer();
  if (viewer.userId) redirect(next);
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } = env();

  return (
    <main className="mx-auto grid w-full max-w-md flex-1 content-center px-4 py-12">
      <div className="panel rounded-3xl p-7 sm:p-9">
        <h1 className="font-display text-4xl">Sign in</h1>
        <p className="mb-7 mt-2 text-muted-foreground">
          Keep your streak and stats on every device. Games you&apos;ve played here come with you.
        </p>
        <SignInForm next={next} googleEnabled={!!(GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET)} />
      </div>
    </main>
  );
}
