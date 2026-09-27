import { Check, Flag, SkipForward, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GuessRecord } from "./types";

const STYLE: Record<GuessRecord["kind"], { row: string; icon: React.ReactNode; label: string }> = {
  correct: { row: "bg-mint/15 text-mint ring-mint/40", icon: <Check className="h-4 w-4" />, label: "Correct" },
  wrong: { row: "bg-rani/12 text-rani ring-rani/35", icon: <X className="h-4 w-4" />, label: "Wrong" },
  skip: { row: "bg-white/5 text-muted-foreground ring-white/10", icon: <SkipForward className="h-4 w-4" />, label: "Skipped" },
  giveup: { row: "bg-white/5 text-muted-foreground ring-white/10", icon: <Flag className="h-4 w-4" />, label: "Gave up" },
};

export function GuessList({ guesses, maxGuesses, active }: { guesses: GuessRecord[]; maxGuesses: number; active: boolean }) {
  return (
    <ol className="grid grid-cols-1 gap-2" aria-label="Your guesses">
      {Array.from({ length: maxGuesses }, (_, i) => {
        const guess = guesses[i];
        const current = active && i === guesses.length;
        if (!guess) {
          return (
            <li
              key={i}
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-4 text-sm ring-1",
                current ? "text-foreground ring-marigold/60" : "text-muted-foreground/50 ring-white/8",
              )}
            >
              <span className="w-4 text-center tabular-nums">{i + 1}</span>
              <span>{current ? "Your guess" : ""}</span>
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
