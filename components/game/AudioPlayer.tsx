"use client";

import { Pause, Play, LoaderCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSnippetPlayer } from "@/lib/hooks/useSnippetPlayer";

interface AudioPlayerProps {
  clipUrl: string;
  snippetSeconds: number;
  schedule: readonly number[];
  completed: boolean;
}

const TIMELINE_SECONDS = 9;

function Vinyl({ spinning }: { spinning: boolean }) {
  return (
    <svg viewBox="0 0 200 200" className={cn("h-full w-full", spinning && "vinyl-spin")} aria-hidden="true">
      <defs>
        <radialGradient id="vinyl-sheen" cx="35%" cy="30%" r="75%">
          <stop offset="0%" stopColor="#3a2a55" />
          <stop offset="55%" stopColor="#120b1f" />
          <stop offset="100%" stopColor="#07040d" />
        </radialGradient>
        <linearGradient id="vinyl-label" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff2e88" />
          <stop offset="100%" stopColor="#ffb020" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="98" fill="url(#vinyl-sheen)" />
      {[88, 80, 72, 64, 56, 48].map((r) => (
        <circle key={r} cx="100" cy="100" r={r} fill="none" stroke="rgb(255 255 255 / 0.07)" strokeWidth="1" />
      ))}
      <path d="M40 60 A 70 70 0 0 1 90 32" stroke="rgb(255 255 255 / 0.18)" strokeWidth="5" fill="none" strokeLinecap="round" />
      <circle cx="100" cy="100" r="34" fill="url(#vinyl-label)" />
      <circle cx="100" cy="100" r="4" fill="#0b0716" />
    </svg>
  );
}

export function AudioPlayer({ clipUrl, snippetSeconds, schedule, completed }: AudioPlayerProps) {
  const { status, progressSeconds, toggle } = useSnippetPlayer({
    src: clipUrl,
    limitSeconds: completed ? null : snippetSeconds,
  });
  const playing = status === "playing";
  const timeline = completed ? Math.max(TIMELINE_SECONDS, progressSeconds) : TIMELINE_SECONDS;

  return (
    <div className="flex flex-col items-center gap-5">
      <button
        type="button"
        onClick={toggle}
        disabled={status === "loading" || status === "error"}
        aria-label={playing ? "Stop the snippet" : `Play ${completed ? "the song" : `${snippetSeconds} seconds`}`}
        className="group relative h-44 w-44 rounded-full shadow-[0_0_80px_-10px_rgb(255_46_136/0.55)] transition-transform duration-300 hover:scale-[1.03] focus-visible:outline-offset-4 disabled:cursor-wait sm:h-52 sm:w-52"
      >
        <Vinyl spinning={playing} />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-night/80 text-foreground ring-1 ring-white/20 backdrop-blur transition-colors group-hover:text-marigold">
            {status === "loading" ? (
              <LoaderCircle className="h-6 w-6 animate-spin" />
            ) : status === "error" ? (
              <TriangleAlert className="h-6 w-6 text-rani" />
            ) : playing ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="ml-1 h-6 w-6" />
            )}
          </span>
        </span>
      </button>

      {status === "error" && (
        <p className="text-sm text-rani">This clip didn&apos;t load. Refresh the page to try again.</p>
      )}

      {/* Heardle-style timeline: segments are the unlock points 0.4/1/2/5/7/9s. */}
      <div className="w-full max-w-md">
        <div className="relative h-3 overflow-hidden rounded-full bg-white/8 ring-1 ring-white/10">
          <div
            className="absolute inset-y-0 left-0 bg-white/12"
            style={{ width: `${(Math.min(completed ? timeline : snippetSeconds, timeline) / timeline) * 100}%` }}
          />
          <div
            className="absolute inset-y-0 left-0 bg-gradient-to-r from-peacock via-rani to-marigold"
            style={{ width: `${(Math.min(progressSeconds, timeline) / timeline) * 100}%` }}
          />
          {!completed &&
            schedule.slice(0, -1).map((s) => (
              <span key={s} className="absolute inset-y-0 w-px bg-night/80" style={{ left: `${(s / timeline) * 100}%` }} />
            ))}
        </div>
        <div className="mt-2 flex justify-between text-xs tabular-nums text-muted-foreground">
          <span>{progressSeconds.toFixed(1)}s</span>
          <span>{completed ? "Full preview unlocked" : `${snippetSeconds}s unlocked`}</span>
        </div>
      </div>
    </div>
  );
}
