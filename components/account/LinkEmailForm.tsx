"use client";

import { useActionState } from "react";
import { linkEmailAction, type ActionState } from "@/app/account/actions";

export function LinkEmailForm() {
  const [state, action, pending] = useActionState<ActionState, FormData>(linkEmailAction, { ok: false, message: "" });
  return (
    <form action={action} className="grid gap-3 sm:grid-cols-[1fr_auto]">
      <label htmlFor="link-email" className="sr-only">
        Email you paid with
      </label>
      <input
        id="link-email"
        name="email"
        type="email"
        required
        placeholder="Email you paid with"
        className="h-11 rounded-full bg-night/70 px-4 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-marigold"
      />
      <button type="submit" disabled={pending} className="h-11 rounded-full bg-white/10 px-5 font-bold ring-1 ring-white/15 hover:bg-white/15 disabled:opacity-60">
        {pending ? "Sending…" : "Send confirmation"}
      </button>
      {state.message && (
        <p role="status" className={`text-sm sm:col-span-2 ${state.ok ? "text-mint" : "text-rani"}`}>
          {state.message}
        </p>
      )}
    </form>
  );
}
