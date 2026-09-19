"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { useSnippetPlayer } from "@/lib/hooks/useSnippetPlayer";
import { Play, Loader2, RotateCcw } from "lucide-react";
import { ReelMark } from "@/components/layout/ReelMark";
import { cn } from "@/lib/utils";

const BAR_COUNT = 40;

// Deterministic pseudo-random bar heights, seeded from the audio src, so the
// waveform looks like a real clip's shape instead of flat bars, and stays
// stable across re-renders for the same snippet.
function waveformHeights(seed: string): number[] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const heights: number[] = [];
  for (let i = 0; i < BAR_COUNT; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    heights.push(0.25 + (h % 1000) / 1000 / 1.3);
  }
  return heights;
}

interface AudioPlayerProps {
  audioSrc: string;
  snippetDurationSec: number;
}

export function AudioPlayer({ audioSrc, snippetDurationSec }: AudioPlayerProps) {
  const { isPlaying, progress, isReady, play } = useSnippetPlayer({
    src: audioSrc,
    snippetDurationSec,
  });

  const heights = useMemo(() => waveformHeights(audioSrc), [audioSrc]);
  const activeBars = Math.round(progress * BAR_COUNT);

  return (
    <div className="flex flex-col items-center gap-4 rounded-lg border border-border bg-card p-6">
      <div
        className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full border-2 border-primary text-primary transition-colors",
          isPlaying && "bg-primary/10",
        )}
      >
        <ReelMark className={cn("h-7 w-7", isPlaying && "animate-spin [animation-duration:3s]")} />
      </div>

      <div className="flex h-14 w-full items-center justify-center gap-[3px]">
        {heights.map((h, i) => (
          <span
            key={i}
            className={cn(
              "w-full max-w-1.5 flex-1 rounded-sm transition-colors duration-150",
              i < activeBars ? "bg-primary" : "bg-border",
            )}
            style={{ height: `${Math.round(h * 100)}%` }}
          />
        ))}
      </div>

      <div className="flex w-full items-center justify-center gap-6">
        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary"
          onClick={play}
          disabled={!isReady}
          aria-label="Replay from start"
        >
          <RotateCcw className="h-5 w-5" />
        </Button>

        <Button
          size="icon"
          className="h-14 w-14 shrink-0 rounded-full"
          onClick={play}
          disabled={!isReady}
          aria-label="Play snippet"
        >
          {isReady ? <Play className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
        </Button>

        <span className="w-9 shrink-0 rounded border border-border px-2 py-1 text-center text-xs font-medium text-muted-foreground">
          {snippetDurationSec}s
        </span>
      </div>

      <p className="text-xs text-muted-foreground">
        {isPlaying ? "Playing…" : "Tap play to hear the snippet"}
      </p>
    </div>
  );
}
