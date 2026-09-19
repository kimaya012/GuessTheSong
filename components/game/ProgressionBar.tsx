"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { HINT_REVEAL_ORDER } from "@/lib/constants";
import type { GuessRecord } from "./types";

const LABELS: Record<string, string> = {
  releaseYear: "Year",
  duration: "Duration",
  album: "Album",
  artist: "Artist",
  firstLetter: "First Letter",
};

const COLORS: Record<string, string> = {
  releaseYear: "text-primary",
  duration: "text-secondary",
  album: "text-accent-foreground",
  artist: "text-[--color-win]",
  firstLetter: "text-chart-5",
};

function formatValue(key: string, value: string | number | null | undefined): string {
  if (value == null) return "Unknown";
  if (key === "duration" && typeof value === "number") {
    const m = Math.floor(value / 60);
    const s = value % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  }
  return String(value);
}

// The hint that unlocks right before attempt N (N is 1-indexed); attempt 1
// is always a blind first listen.
function hintKeyForBox(n: number) {
  return n >= 2 ? HINT_REVEAL_ORDER[n - 2] : undefined;
}

interface ProgressionBarProps {
  maxAttempts: number;
  guesses: GuessRecord[];
  attemptsUsed: number;
  revealedHints: Partial<Record<string, string | number | null>>;
}

export function ProgressionBar({
  maxAttempts,
  guesses,
  attemptsUsed,
  revealedHints,
}: ProgressionBarProps) {
  const nextAttempt = Math.min(attemptsUsed + 1, maxAttempts);
  const [selected, setSelected] = useState<number | null>(nextAttempt);
  const [lastAttemptsUsed, setLastAttemptsUsed] = useState(attemptsUsed);

  // Jump the selection to the newest unlocked level whenever a new attempt
  // is made, so the player sees what they just unlocked. Adjusting state
  // during render (React's recommended pattern) instead of in an effect.
  if (attemptsUsed !== lastAttemptsUsed) {
    setLastAttemptsUsed(attemptsUsed);
    setSelected(nextAttempt);
  }

  const boxes = Array.from({ length: maxAttempts }, (_, i) => i + 1);

  function isUnlocked(n: number) {
    if (n === 1) return true;
    const key = hintKeyForBox(n);
    return key ? key in revealedHints : n <= nextAttempt;
  }

  const selectedKey = selected != null ? hintKeyForBox(selected) : undefined;
  const selectedValue = selectedKey ? revealedHints[selectedKey] : undefined;
  const selectedHintReady = selectedKey != null && selectedKey in revealedHints;

  return (
    <div className="rounded-lg border border-border bg-card px-3 pb-3 pt-2">
      {/* sprocket perforations — one per frame, top edge of the strip */}
      <div className="mb-2 flex justify-between px-1.5">
        {boxes.map((n) => (
          <span key={n} className="h-1 w-1 rounded-full bg-border" />
        ))}
      </div>

      <div className="flex gap-1.5">
        {boxes.map((n) => {
          const guess = guesses.find((g) => g.attemptNumber === n);
          const unlocked = isUnlocked(n);
          return (
            <button
              key={n}
              type="button"
              disabled={!unlocked}
              onClick={() => setSelected(n)}
              title={unlocked ? `Attempt ${n}` : "Locked — keep guessing to unlock"}
              className={cn(
                "flex h-9 flex-1 items-center justify-center rounded-sm border text-xs font-semibold transition-colors",
                !unlocked && "cursor-not-allowed border-dashed border-border text-muted-foreground/40",
                unlocked && selected === n && "ring-1 ring-primary ring-offset-1 ring-offset-card",
                guess?.correct && "border-[--color-win] bg-[--color-win] text-white",
                guess?.gaveUp && "border-muted-foreground/40 bg-muted text-muted-foreground",
                guess &&
                  !guess.correct &&
                  !guess.gaveUp &&
                  guess.title !== "" &&
                  "border-secondary bg-secondary/15 text-secondary",
                guess && !guess.correct && !guess.gaveUp && guess.title === "" && "border-muted bg-muted",
                unlocked && !guess && "border-primary/40 bg-primary/5 text-primary hover:bg-primary/10",
              )}
            >
              {n}
            </button>
          );
        })}
      </div>

      {/* sprocket perforations — bottom edge */}
      <div className="mt-2 flex justify-between px-1.5">
        {boxes.map((n) => (
          <span key={n} className="h-1 w-1 rounded-full bg-border" />
        ))}
      </div>

      {selected === 1 && (
        <p className="mt-2.5 text-sm text-muted-foreground">
          First listen — no hints yet. Guess or skip to unlock one.
        </p>
      )}

      {selected != null && selected > 1 && !selectedHintReady && (
        <p className="mt-2.5 text-sm text-muted-foreground">
          Locked — reach attempt {selected} to unlock this hint.
        </p>
      )}

      {selected != null && selected > 1 && selectedHintReady && selectedKey && (
        <p className="mt-2.5 text-sm">
          <span className={cn("font-semibold", COLORS[selectedKey])}>
            {LABELS[selectedKey] ?? selectedKey}:
          </span>{" "}
          <span className="font-medium">{formatValue(selectedKey, selectedValue)}</span>
        </p>
      )}
    </div>
  );
}
