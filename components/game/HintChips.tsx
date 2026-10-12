import { Lock } from "lucide-react";
import type { HintKey, PuzzleShell } from "./types";

const HINTS: { key: HintKey; label: string }[] = [
  { key: "length", label: "Length" },
  { key: "releaseYear", label: "Released" },
  { key: "genre", label: "Vibe" },
  { key: "album", label: "From" },
  { key: "artist", label: "Artist" },
];

export function HintChips({ hints }: { hints: PuzzleShell["hints"] }) {
  return (
    <ul className="flex flex-wrap justify-center gap-2" aria-label="Hints">
      {HINTS.map(({ key, label }, i) => {
        const unlocked = key in hints;
        const value = hints[key];
        return (
          <li
            key={key}
            title={unlocked ? undefined : `Unlocks after guess ${i + 1}`}
            className={
              unlocked
                ? "rounded-full bg-peacock/12 px-3 py-1.5 text-sm text-foreground ring-1 ring-peacock/35"
                : "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted-foreground/70 ring-1 ring-white/10"
            }
          >
            {unlocked ? (
              <>
                <span className="text-peacock">{label}</span> <span className="font-semibold">{value ?? "Unknown"}</span>
              </>
            ) : (
              <>
                <Lock className="h-3 w-3" aria-hidden="true" />
                {label}
                <span className="sr-only"> unlocks after guess {i + 1}</span>
              </>
            )}
          </li>
        );
      })}
    </ul>
  );
}
