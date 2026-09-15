"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { GuessRecord, PuzzleShell } from "./types";

function buildShareText(shell: PuzzleShell): string {
  const boxes = Array.from({ length: shell.maxAttempts }, (_, i) => {
    const attemptNumber = i + 1;
    const guess = shell.guesses.find((g: GuessRecord) => g.attemptNumber === attemptNumber);
    if (!guess) return "⬜";
    if (guess.correct) return "🟩";
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
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(buildShareText(shell));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable — silently ignore, button just won't confirm.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{shell.won ? "You got it!" : "Better luck tomorrow"}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {shell.answer && (
          <p className="text-sm">
            <span className="font-medium">{shell.answer.title}</span>
            {" — "}
            <span className="text-muted-foreground">{shell.answer.artist}</span>
          </p>
        )}
        <pre className="whitespace-pre-wrap font-sans text-sm">{buildShareText(shell)}</pre>
        <Button onClick={handleCopy} variant="outline" size="sm">
          {copied ? "Copied!" : "Copy result"}
        </Button>
      </CardContent>
    </Card>
  );
}
