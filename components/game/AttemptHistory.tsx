import { cn } from "@/lib/utils";
import type { GuessRecord } from "./types";

interface AttemptHistoryProps {
  maxAttempts: number;
  guesses: GuessRecord[];
}

export function AttemptHistory({ maxAttempts, guesses }: AttemptHistoryProps) {
  const boxes = Array.from({ length: maxAttempts }, (_, i) => {
    const attemptNumber = i + 1;
    const guess = guesses.find((g) => g.attemptNumber === attemptNumber);
    return { attemptNumber, guess };
  });

  return (
    <div className="flex gap-1.5">
      {boxes.map(({ attemptNumber, guess }) => (
        <div
          key={attemptNumber}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded border text-xs font-medium",
            !guess && "border-dashed text-muted-foreground",
            guess?.correct && "border-green-600 bg-green-600 text-white",
            guess && !guess.correct && guess.title !== "" && "border-amber-500 bg-amber-500/20",
            guess && guess.title === "" && "border-muted bg-muted",
          )}
          title={guess?.title || undefined}
        >
          {attemptNumber}
        </div>
      ))}
    </div>
  );
}
