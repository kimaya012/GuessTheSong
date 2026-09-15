"use client";

import { useEffect, useState } from "react";
import { useDeviceId } from "@/lib/hooks/useDeviceId";
import { AudioPlayer } from "./AudioPlayer";
import { GuessInput } from "./GuessInput";
import { HintsPanel } from "./HintsPanel";
import { AttemptHistory } from "./AttemptHistory";
import { ResultShareCard } from "./ResultShareCard";
import { AdSlot } from "@/components/ads/AdSlot";
import type { CatalogSong, PuzzleShell } from "./types";

interface GameBoardProps {
  date: string; // "today" or an ISO date string
  puzzleEndpoint: string; // e.g. /api/puzzle/today or /api/puzzle/2026-09-10
  audioEndpoint: string; // date-scoped, e.g. /api/audio/2026-09-10
}

export function GameBoard({ date, puzzleEndpoint, audioEndpoint }: GameBoardProps) {
  const deviceId = useDeviceId();
  const [shell, setShell] = useState<PuzzleShell | null>(null);
  const [catalog, setCatalog] = useState<CatalogSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!deviceId) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [puzzleRes, catalogRes] = await Promise.all([
          fetch(`${puzzleEndpoint}?deviceId=${deviceId}`),
          fetch("/api/catalog"),
        ]);
        if (!puzzleRes.ok) {
          const body = await puzzleRes.json().catch(() => ({}));
          throw new Error(body.error ?? "Failed to load puzzle.");
        }
        const puzzleData: PuzzleShell = await puzzleRes.json();
        const catalogData: CatalogSong[] = await catalogRes.json();
        if (!cancelled) {
          setShell(puzzleData);
          setCatalog(catalogData);
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [deviceId, puzzleEndpoint]);

  async function submit(songId: string | null, guessText: string) {
    if (!deviceId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/puzzle/${date}/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, songId, guessText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to submit guess.");
        return;
      }
      setShell(data.shell);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">Loading today&apos;s puzzle…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error}</p>;
  }
  if (!shell) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Puzzle #{shell.puzzleNumber}</h2>
        <AttemptHistory maxAttempts={shell.maxAttempts} guesses={shell.guesses} />
      </div>

      <AudioPlayer audioSrc={audioEndpoint} snippetDurationSec={shell.snippetDurationSec} />

      <HintsPanel revealedHints={shell.revealedHints} />

      {shell.completed ? (
        <>
          <ResultShareCard shell={shell} />
          <AdSlot slotId="result-banner" className="mt-4" />
        </>
      ) : (
        <GuessInput
          catalog={catalog}
          disabled={submitting}
          onGuess={(song) => submit(song.id, song.title)}
          onSkip={() => submit(null, "")}
        />
      )}
    </div>
  );
}
