"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { isSnoozed, parseSnooze, snoozedUntil } from "@/lib/nudge";

interface SignInNudgeProps {
  next: string; // where to return after signing in
  storageKey: string; // one snooze per place the nudge appears
  title: string;
  body: string;
}

const STORAGE_PREFIX = "gts_nudge_";

// A friendly, dismissible prompt in the corner. It never blocks the page,
// appears a moment after load, and stays away for a week once dismissed.
export function SignInNudge({ next, storageKey, title, body }: SignInNudgeProps) {
  const [visible, setVisible] = useState(false);
  const key = `${STORAGE_PREFIX}${storageKey}`;

  useEffect(() => {
    let snoozed = false;
    try {
      snoozed = isSnoozed(parseSnooze(window.localStorage.getItem(key)), Date.now());
    } catch {
      // Storage unavailable (private mode): just show it.
    }
    if (snoozed) return;
    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, [key]);

  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && dismiss();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- dismiss only reads `key`
  }, [visible]);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(key, String(snoozedUntil(Date.now())));
    } catch {
      // Nothing to do: it will simply show again next visit.
    }
  }

  if (!visible) return null;

  return (
    <aside
      aria-label="Sign in"
      className="panel fixed inset-x-4 bottom-4 z-40 mx-auto max-w-sm rounded-2xl p-4 shadow-2xl animate-in fade-in-0 slide-in-from-bottom-3 duration-300 motion-reduce:animate-none sm:inset-x-auto sm:right-6 sm:mx-0"
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Not now"
        className="absolute right-2 top-2 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="pr-6 font-display text-xl leading-tight">{title}</p>
      <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
      <div className="mt-3 flex items-center gap-3">
        <Link
          href={`/sign-in?next=${encodeURIComponent(next)}`}
          className="rounded-full bg-marigold px-4 py-2 text-sm font-bold text-primary-foreground"
        >
          Sign in free
        </Link>
        <button type="button" onClick={dismiss} className="text-sm font-semibold text-muted-foreground hover:text-foreground">
          Not now
        </button>
      </div>
    </aside>
  );
}
