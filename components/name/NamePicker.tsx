"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Shuffle } from "lucide-react";
import { cn } from "@/lib/utils";
import { FORMAT_MESSAGES, NAME_MAX_LENGTH, NAME_MIN_LENGTH, checkNameFormat } from "@/lib/names/rules";
import { isSnoozed, parseSnooze, snoozedUntil } from "@/lib/nudge";

interface NameState {
  name: string | null;
  signedIn: boolean;
  canChange: boolean;
  reason: "SIGN_IN_REQUIRED" | "COOLDOWN" | null;
  retryAt: string | null;
}

interface NamePickerProps {
  // "card" sits on the result screen and only appears while you have no name;
  // "section" is a permanent block on the stats and account pages.
  variant: "card" | "section";
  next: string; // where to return after signing in
}

const SNOOZE_KEY = "gts_nudge_name";
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-IN", { dateStyle: "medium" });

export function NamePicker({ variant, next }: NamePickerProps) {
  const router = useRouter();
  const [state, setState] = useState<NameState | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [value, setValue] = useState("");
  const [touched, setTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [hidden, setHidden] = useState(false);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch("/api/name/suggest", { cache: "no-store" });
      if (res.ok) setSuggestions((await res.json()).names ?? []);
    } catch {
      // Suggestions are a nicety; typing a name still works.
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let snoozed = false;
      try {
        snoozed = variant === "card" && isSnoozed(parseSnooze(window.localStorage.getItem(SNOOZE_KEY)), Date.now());
      } catch {
        // Storage blocked: just show it.
      }
      if (snoozed) {
        if (!cancelled) setHidden(true);
        return;
      }
      try {
        const res = await fetch("/api/name", { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const next: NameState = await res.json();
        setState(next);
        if (next.canChange) void loadSuggestions();
      } catch {
        // Offline or blocked: render nothing.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [variant, loadSuggestions]);

  const format = checkNameFormat(value);
  const formatError = touched && value.trim() !== "" && !format.ok ? FORMAT_MESSAGES[format.reason] : null;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!format.ok) {
      setError(FORMAT_MESSAGES[format.reason]);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: format.name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(
          data.message ??
            (data.error === "COOLDOWN" && data.retryAt
              ? `You can change your name again on ${fmtDate(data.retryAt)}.`
              : data.error === "RATE_LIMITED"
                ? "That's a lot of tries. Wait a little and try again."
                : "We couldn't save that name. Try again."),
        );
        return;
      }
      setState(data);
      setEditing(false);
      setJustSaved(true);
      setValue("");
      setTouched(false);
      router.refresh(); // the header shows the name too
    } catch {
      setError("You seem to be offline. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  function maybeLater() {
    try {
      window.localStorage.setItem(SNOOZE_KEY, String(snoozedUntil(Date.now())));
    } catch {
      // Not remembered; it will show again.
    }
    setHidden(true);
  }

  if (hidden || !state) return null;
  // On the result card, only ask people who have no name yet.
  if (variant === "card" && state.name && !justSaved) return null;

  const container = cn(
    variant === "card" ? "rounded-2xl bg-white/5 p-4 ring-1 ring-white/10" : "panel rounded-3xl p-6",
  );

  if (state.name && !editing) {
    return (
      <section className={container} aria-label="Your name">
        <p role={justSaved ? "status" : undefined} className="text-sm text-muted-foreground">
          {justSaved ? "Saved. You are" : "Your name"}
        </p>
        <p className="font-display text-3xl leading-tight">{state.name}</p>
        <div className="mt-3 text-sm">
          {state.canChange ? (
            <button
              type="button"
              onClick={() => {
                setEditing(true);
                setJustSaved(false);
                setValue(state.name ?? "");
              }}
              className="font-semibold text-peacock hover:underline"
            >
              Change name
            </button>
          ) : state.reason === "SIGN_IN_REQUIRED" ? (
            <p className="text-muted-foreground">
              <Link href={`/sign-in?next=${encodeURIComponent(next)}`} className="font-semibold text-peacock hover:underline">
                Sign in
              </Link>{" "}
              to change your name and keep it on every device.
            </p>
          ) : (
            <p className="text-muted-foreground">
              You can change it again on {state.retryAt ? fmtDate(state.retryAt) : "a later date"}.
            </p>
          )}
        </div>
      </section>
    );
  }

  return (
    <section className={container} aria-label="Pick your name">
      <h2 className={variant === "card" ? "font-display text-2xl leading-tight" : "text-lg font-semibold"}>
        {state.name ? "Change your name" : "Pick your name"}
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        A public name for you. Letters and numbers only, {NAME_MIN_LENGTH} to {NAME_MAX_LENGTH} characters.
        {!state.signedIn && !state.name ? " Changing it later needs a free account." : ""}
      </p>

      {suggestions.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2" aria-label="Name ideas">
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => {
                setValue(s);
                setTouched(true);
                setError(null);
              }}
              className="rounded-full bg-peacock/12 px-3 py-1.5 text-sm font-semibold ring-1 ring-peacock/35 hover:bg-peacock/20"
            >
              {s}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void loadSuggestions()}
            aria-label="Show other ideas"
            className="grid h-8 w-8 place-items-center rounded-full text-muted-foreground ring-1 ring-white/15 hover:text-foreground"
          >
            <Shuffle className="h-4 w-4" />
          </button>
        </div>
      )}

      <form onSubmit={save} className="mt-3 flex flex-col gap-2 sm:flex-row">
        <label htmlFor={`name-${variant}`} className="sr-only">
          Your name
        </label>
        <input
          id={`name-${variant}`}
          value={value}
          maxLength={NAME_MAX_LENGTH}
          autoComplete="off"
          autoCapitalize="off"
          spellCheck={false}
          onChange={(e) => {
            setValue(e.target.value);
            setError(null);
          }}
          onBlur={() => setTouched(true)}
          aria-invalid={!!(formatError || error)}
          aria-describedby={`name-msg-${variant}`}
          placeholder="Type a name"
          className="h-11 min-w-0 flex-1 rounded-full bg-night/70 px-4 ring-1 ring-white/15 focus:outline-none focus:ring-2 focus:ring-marigold"
        />
        <button
          type="submit"
          disabled={saving || !format.ok}
          className="h-11 rounded-full bg-marigold px-5 font-bold text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save name"}
        </button>
      </form>

      <p id={`name-msg-${variant}`} role={error || formatError ? "alert" : undefined} className="mt-2 min-h-5 text-sm text-rani">
        {error ?? formatError}
      </p>

      <div className="mt-1 flex items-center gap-4 text-sm">
        {state.name && (
          <button type="button" onClick={() => setEditing(false)} className="font-semibold text-muted-foreground hover:text-foreground">
            Cancel
          </button>
        )}
        {variant === "card" && !state.name && (
          <button type="button" onClick={maybeLater} className="font-semibold text-muted-foreground hover:text-foreground">
            Maybe later
          </button>
        )}
      </div>
    </section>
  );
}
