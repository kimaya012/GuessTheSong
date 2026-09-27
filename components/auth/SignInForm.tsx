"use client";

import { useState } from "react";
import { Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.2 1.3-1.6 3.9-5.5 3.9-3.3 0-6-2.7-6-6.1s2.7-6.1 6-6.1c1.9 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.3 14.6 2.3 12 2.3 6.7 2.3 2.4 6.6 2.4 11.9s4.3 9.6 9.6 9.6c5.5 0 9.2-3.9 9.2-9.4 0-.6-.1-1.1-.2-1.6H12z" />
    </svg>
  );
}

export function SignInForm({ next, googleEnabled }: { next: string; googleEnabled: boolean }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState("");
  const callbackURL = `/auth/complete?next=${encodeURIComponent(next)}`;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    const { error } = await authClient.signIn.magicLink({ email: email.trim(), callbackURL });
    if (error) {
      setError(error.status === 429 ? "Too many attempts. Wait a few minutes and try again." : "We couldn't send the link. Check the address and try again.");
      setState("error");
      return;
    }
    setState("sent");
  }

  async function google() {
    await authClient.signIn.social({ provider: "google", callbackURL });
  }

  if (state === "sent") {
    return (
      <div className="text-center" role="status">
        <Mail className="mx-auto h-10 w-10 text-peacock" />
        <h2 className="mt-4 font-display text-3xl">Check your inbox</h2>
        <p className="mt-2 text-muted-foreground">
          We sent a sign-in link to <span className="font-semibold text-foreground">{email}</span>. It works once and expires in 10 minutes.
        </p>
        <button type="button" onClick={() => setState("idle")} className="mt-5 text-sm font-semibold text-peacock hover:underline">
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="grid gap-4">
      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={google}
            className="inline-flex h-12 items-center justify-center gap-3 rounded-full bg-white font-bold text-night transition-transform hover:-translate-y-px"
          >
            <GoogleIcon /> Continue with Google
          </button>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-white/10" /> or get a sign-in link <span className="h-px flex-1 bg-white/10" />
          </div>
        </>
      )}
      <form onSubmit={sendLink} className="grid gap-3">
        <label htmlFor="email" className="text-sm font-semibold">
          Email address
        </label>
        <input
          id="email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="h-12 rounded-2xl bg-night/70 px-4 text-base ring-1 ring-white/15 placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-marigold"
        />
        {state === "error" && (
          <p role="alert" className="text-sm text-rani">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={state === "sending"}
          className="h-12 rounded-full bg-marigold font-bold text-primary-foreground transition-transform hover:-translate-y-px disabled:opacity-60"
        >
          {state === "sending" ? "Sending…" : "Email me a sign-in link"}
        </button>
      </form>
      <p className="text-center text-xs text-muted-foreground">No passwords. New here? The same link creates your account.</p>
    </div>
  );
}
