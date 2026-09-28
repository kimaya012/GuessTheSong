"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";

export function UserMenu({ name }: { name: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const initial = name.trim().charAt(0).toUpperCase() || "?";

  async function signOut() {
    setBusy(true);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Link
        href="/account"
        title={name}
        aria-label="Your account"
        className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-rani to-marigold font-display text-lg text-night"
      >
        {initial}
      </Link>
      <button
        type="button"
        onClick={signOut}
        disabled={busy}
        className="hidden rounded-full px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50 sm:block"
      >
        Sign out
      </button>
    </div>
  );
}
