"use client";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useSnippetPlayer } from "@/lib/hooks/useSnippetPlayer";
import { Play, Loader2 } from "lucide-react";

interface AudioPlayerProps {
  audioSrc: string;
  snippetDurationSec: number;
}

export function AudioPlayer({ audioSrc, snippetDurationSec }: AudioPlayerProps) {
  const { isPlaying, progress, isReady, play } = useSnippetPlayer({
    src: audioSrc,
    snippetDurationSec,
  });

  return (
    <div className="flex items-center gap-4 rounded-lg border bg-card p-4">
      <Button
        size="icon"
        className="h-12 w-12 shrink-0 rounded-full"
        onClick={play}
        disabled={!isReady}
        aria-label="Play snippet"
      >
        {isReady ? <Play className="h-5 w-5" /> : <Loader2 className="h-5 w-5 animate-spin" />}
      </Button>
      <div className="flex-1">
        <Progress value={progress * 100} className="h-2" />
        <p className="mt-1 text-xs text-muted-foreground">
          {isPlaying ? "Playing" : `${snippetDurationSec}s snippet`}
        </p>
      </div>
    </div>
  );
}
