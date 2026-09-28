"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Crown } from "lucide-react";
import { AudioPlayer } from "./AudioPlayer";
import { GuessInput } from "./GuessInput";
import { GuessList } from "./GuessList";
import { HintChips } from "./HintChips";
import { HowToPlayDialog } from "./HowToPlayDialog";
import { ResultShareCard } from "./ResultShareCard";
import { TiltCard } from "@/components/ui/tilt-card";
import type { CatalogSong, PuzzleShell } from "./types";

interface GameBoardProps {
  date: string; // "today" or an ISO date
  isToday: boolean;
  timezone: string;
  shareUrl: string;
  premium: boolean;
}

const ERROR_COPY: Record<string, string> = {
  NO_PUZZLE: "There's no song scheduled for this day.",
  PREMIUM_REQUIRED: "This puzzle is in the Premium archive.",
  RATE_LIMITED: "That's a lot of guesses at once. Wait a few seconds and try again.",
  ALREADY_COMPLETED: "You've already finished this puzzle.",
  UNKNOWN_SONG: "Pick a song from the suggestions list.",
  FORBIDDEN_ORIGIN: "That request came from an unexpected page. Refresh and try again.",
};

export function GameBoard({ date, isToday, timezone, shareUrl, premium }: GameBoardProps) {
  const [shell, setShell] = useState<PuzzleShell | null>(null);
  const [catalog, setCatalog] = useState<CatalogSong[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch(`/api/puzzle/${date}`, { signal: controller.signal, cache: "no-store" }),
      fetch("/api/catalog", { signal: controller.signal }),
    ])
      .then(async ([puzzleRes, catalogRes]) => {
        const puzzle = await puzzleRes.json();
        if (!puzzleRes.ok) throw new Error(puzzle.error ?? "LOAD_FAILED");
        setShell(puzzle);
        setCatalog(catalogRes.ok ? await catalogRes.json() : []);
      })
      .catch((err: Error) => {
        if (err.name !== "AbortError") setLoadError(ERROR_COPY[err.message] ?? "Today's puzzle didn't load. Refresh to try again.");
      });
    return () => controller.abort();
  }, [date]);

  const submit = useCallback(
    async (songId: string | null, giveUp = false) => {
      if (submitting) return;
      setSubmitting(true);
      setActionError(null);
      try {
        const res = await fetch(`/api/puzzle/${date}/guess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ songId, giveUp }),
        });
        const data = await res.json();
        if (!res.ok) {
          setActionError(ERROR_COPY[data.error] ?? "That guess didn't go through. Try again.");
          return;
        }
        setShell(data);
      } catch {
        setActionError("You seem to be offline. Check your connection and try again.");
      } finally {
        setSubmitting(false);
      }
    },
    [date, submitting],
  );

  if (loadError) {
    return (
      <TiltCard className="rounded-3xl p-8 text-center">
        <p className="text-lg">{loadError}</p>
        {loadError === ERROR_COPY.PREMIUM_REQUIRED && (
          <Link href="/premium" className="mt-4 inline-flex items-center gap-2 rounded-full bg-marigold px-5 py-2.5 font-bold text-primary-foreground">
            <Crown className="h-4 w-4" /> See Premium
          </Link>
        )}
      </TiltCard>
    );
  }

  if (!shell) {
    return (
      <div className="panel grid h-[640px] animate-pulse place-items-center rounded-3xl" aria-busy="true">
        <p className="text-muted-foreground">Cueing up the song…</p>
      </div>
    );
  }

  const completed = shell.status !== "playing";
  const nextGain =
    shell.guessCount + 1 < shell.maxGuesses
      ? Math.round((shell.snippetSchedule[shell.guessCount + 1] - shell.snippetSeconds) * 10) / 10
      : null;

  return (
    <TiltCard className="rounded-3xl p-5 sm:p-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <p className="font-display text-3xl leading-none">Song #{shell.puzzleNumber}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {isToday
              ? "Today's puzzle"
              : new Date(`${shell.date}T00:00:00Z`).toLocaleDateString("en-IN", { dateStyle: "long", timeZone: "UTC" })}
          </p>
        </div>
        <HowToPlayDialog />
      </div>

      <AudioPlayer
        clipUrl={`/api/puzzle/${date}/clip?step=${completed ? "full" : shell.guessCount}`}
        snippetSeconds={shell.snippetSeconds}
        schedule={shell.snippetSchedule}
        completed={completed}
      />

      <div className="mt-7 grid grid-cols-1 gap-6">
        <HintChips hints={shell.hints} />
        <GuessList guesses={shell.guesses} maxGuesses={shell.maxGuesses} active={!completed} />

        {actionError && (
          <p role="alert" className="rounded-xl bg-rani/10 px-4 py-3 text-sm text-rani ring-1 ring-rani/30">
            {actionError}
          </p>
        )}

        {completed ? (
          <ResultShareCard shell={shell} shareUrl={shareUrl} premium={premium} timezone={timezone} isToday={isToday} />
        ) : (
          <GuessInput
            catalog={catalog}
            disabled={submitting}
            nextSnippetGain={nextGain}
            onGuess={(song) => submit(song.id)}
            onSkip={() => submit(null)}
            onGiveUp={() => {
              if (window.confirm("Give up and reveal the song? This counts as a loss.")) void submit(null, true);
            }}
          />
        )}
      </div>
    </TiltCard>
  );
}
