"use client";

import { useEffect, useState } from "react";
import { useDeviceId } from "@/lib/hooks/useDeviceId";
import { AudioPlayer } from "./AudioPlayer";
import { GuessInput } from "./GuessInput";
import { ProgressionBar } from "./ProgressionBar";
import { ResultShareCard } from "./ResultShareCard";
import { ScoreHud } from "./ScoreHud";
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
  const [extending, setExtending] = useState(false);

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

  async function submit(songId: string | null, guessText: string, giveUp = false) {
    if (!deviceId || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/puzzle/${date}/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId, songId, guessText, giveUp }),
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

  function handleGiveUp() {
    if (submitting) return;
    if (window.confirm("Give up on today's puzzle? This ends the game and reveals the answer.")) {
      submit(null, "", true);
    }
  }

  async function handleExtend() {
    if (!deviceId || extending) return;
    setExtending(true);
    try {
      const res = await fetch(`/api/puzzle/${date}/extend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deviceId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to extend the snippet.");
        return;
      }
      setShell(data.shell);
    } finally {
      setExtending(false);
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
      <h2 className="font-heading text-lg text-foreground">Puzzle #{shell.puzzleNumber}</h2>

      <ScoreHud
        currentScore={shell.currentScore}
        snippetDurationSec={shell.snippetDurationSec}
        extendCost={shell.extendCost}
        onExtend={handleExtend}
        extending={extending}
        disabled={shell.completed}
      />

      <AudioPlayer audioSrc={audioEndpoint} snippetDurationSec={shell.snippetDurationSec} />

      <ProgressionBar
        maxAttempts={shell.maxAttempts}
        guesses={shell.guesses}
        attemptsUsed={shell.attemptsUsed}
        revealedHints={shell.revealedHints}
      />

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
          onGiveUp={handleGiveUp}
        />
      )}
    </div>
  );
}
