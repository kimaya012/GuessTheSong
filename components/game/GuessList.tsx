import { Check, Flag, SkipForward, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { visibleGuessRows } from "@/lib/game/rules";
import type { GuessRecord } from "./types";

const STYLE: Record<GuessRecord["kind"], { row: string; icon: React.ReactNode; label: string }> = {
  correct: { row: "bg-mint/15 text-mint ring-mint/40", icon: <Check className="h-4 w-4" />, label: "Correct" },
  wrong: { row: "bg-rani/12 text-rani ring-rani/35", icon: <X className="h-4 w-4" />, label: "Wrong" },
  skip: { row: "bg-white/5 text-muted-foreground ring-white/10", icon: <SkipForward className="h-4 w-4" />, label: "Skipped" },
  giveup: { row: "bg-white/5 text-muted-foreground ring-white/10", icon: <Flag className="h-4 w-4" />, label: "Gave up" },
};

interface GuessListProps {
  guesses: GuessRecord[];
  maxGuesses: number;
  active: boolean;
}

// Shows only the guesses made plus the one being entered, so the list
// starts at a single row and grows by one per guess instead of reserving
// space for all six up front.
export function GuessList({ guesses, maxGuesses, active }: GuessListProps) {
  const rows = Math.min(visibleGuessRows(guesses.length, active ? "playing" : "lost"), maxGuesses);

  return (
    <ol className="grid grid-cols-1 gap-2" aria-label="Your guesses">
      {Array.from({ length: rows }, (_, i) => {
        const guess = guesses[i];
        if (!guess) {
          // The row currently being filled in; it slides in when added.
          return (
            <li
              key={i}
              aria-current="step"
              className="flex h-11 animate-in items-center gap-3 rounded-xl px-4 text-sm text-foreground ring-1 ring-marigold/60 duration-200 fade-in-0 slide-in-from-top-1 motion-reduce:animate-none"
            >
              <span className="w-4 text-center tabular-nums">{i + 1}</span>
              <span>Your guess</span>
            </li>
          );
        }
        const s = STYLE[guess.kind];
        return (
          <li key={i} className={cn("flex h-11 items-center gap-3 rounded-xl px-4 text-sm font-semibold ring-1", s.row)}>
            <span className="w-4">{s.icon}</span>
            <span className="truncate">{guess.kind === "wrong" || guess.kind === "correct" ? guess.title : s.label}</span>
            <span className="sr-only">{s.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
