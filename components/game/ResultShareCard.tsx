"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import { ExternalLink, PartyPopper, Flag, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { GuessRecord, PuzzleShell } from "./types";

function celebrate() {
  const colors = ["#eab04a", "#d3583c", "#c7a468", "#59a476"];
  const shoot = (opts: confetti.Options) =>
    confetti({ colors, origin: { y: 0.7 }, disableForReducedMotion: true, ...opts });

  shoot({ particleCount: 90, spread: 70, angle: 60, origin: { x: 0.15, y: 0.7 } });
  shoot({ particleCount: 90, spread: 70, angle: 120, origin: { x: 0.85, y: 0.7 } });
  shoot({ particleCount: 60, spread: 100, startVelocity: 45 });
}

function buildShareText(shell: PuzzleShell): string {
  const boxes = Array.from({ length: shell.maxAttempts }, (_, i) => {
    const attemptNumber = i + 1;
    const guess = shell.guesses.find((g: GuessRecord) => g.attemptNumber === attemptNumber);
    if (!guess) return "⬜";
    if (guess.correct) return "🟩";
    if (guess.gaveUp) return "🏳️";
    if (guess.title === "") return "⬛"; // explicit skip
    return "🟨";
  }).join("");

  const resultLine = shell.won ? `${shell.attemptsUsed}/${shell.maxAttempts}` : `X/${shell.maxAttempts}`;

  return `GuessTheBollySong #${shell.puzzleNumber} ${resultLine}\n${boxes}`;
}

interface ResultShareCardProps {
  shell: PuzzleShell;
}

export function ResultShareCard({ shell }: ResultShareCardProps) {
  const gaveUp = shell.guesses.some((g) => g.gaveUp);

  useEffect(() => {
    if (shell.won) celebrate();
    // Fire once when this card mounts for a win — not on every re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const HeadlineIcon = shell.won ? PartyPopper : gaveUp ? Flag : Moon;

  return (
    <Card
      className={
        shell.won
          ? "border-l-4 border-l-[--color-win]"
          : "border-l-4 border-l-secondary"
      }
    >
      <CardHeader>
        <CardTitle
          className={cn(
            "flex items-center gap-2 font-heading text-2xl font-normal",
            shell.won ? "text-[--color-win]" : "text-foreground",
          )}
        >
          <HeadlineIcon className="h-5 w-5" />
          {shell.won ? "You got it" : gaveUp ? "You gave up" : "Better luck tomorrow"}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {shell.answer && (
          <p className="text-sm">
            <span className="font-semibold">{shell.answer.title}</span>
            {" — "}
            <span className="text-muted-foreground">{shell.answer.artist}</span>
          </p>
        )}
        {shell.won && shell.pointsEarned != null && (
          <p className="inline-flex w-fit items-center gap-1.5 rounded border border-border px-3 py-1 text-sm font-semibold text-accent-foreground">
            +{shell.pointsEarned} points
          </p>
        )}
        <pre className="whitespace-pre-wrap rounded-lg bg-muted/60 p-3 font-sans text-sm tracking-wide">
          {buildShareText(shell)}
        </pre>
        <div className="flex flex-wrap gap-2">
          {shell.answer?.externalUrl && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              nativeButton={false}
              render={
                <a href={shell.answer.externalUrl} target="_blank" rel="noopener noreferrer" />
              }
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Listen to the full song
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
