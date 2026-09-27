"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Share2 } from "lucide-react";
import { buildShareText } from "@/lib/game/share";
import { Countdown } from "./Countdown";
import { AdSlot } from "@/components/ads/AdSlot";
import type { PlayerStats, PuzzleShell } from "./types";

interface ResultShareCardProps {
  shell: PuzzleShell;
  shareUrl: string;
  premium: boolean;
  timezone: string;
  isToday: boolean;
}

export function ResultShareCard({ shell, shareUrl, premium, timezone, isToday }: ResultShareCardProps) {
  const won = shell.status === "won";
  const answer = shell.answer!;
  const [stats, setStats] = useState<PlayerStats | null>(null);
  const [copied, setCopied] = useState(false);
  const celebrated = useRef(false);

  useEffect(() => {
    fetch("/api/stats", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setStats(data.stats))
      .catch(() => {});
  }, [shell.status]);

  useEffect(() => {
    if (!won || celebrated.current) return;
    celebrated.current = true;
    import("canvas-confetti").then(({ default: confetti }) =>
      confetti({
        particleCount: 110,
        spread: 75,
        origin: { y: 0.65 },
        colors: ["#ffb020", "#ff2e88", "#16d9c8", "#3ee6a8"],
        disableForReducedMotion: true,
      }),
    );
  }, [won]);

  async function share() {
    const text = buildShareText({
      puzzleNumber: shell.puzzleNumber,
      guesses: shell.guesses,
      status: shell.status,
      url: shareUrl,
      premium,
    });
    try {
      if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
        await navigator.share({ text });
        return;
      }
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed or clipboard blocked: nothing to do.
    }
  }

  return (
    <section aria-live="polite" className="grid grid-cols-1 gap-5">
      <div className="text-center">
        <h2 className="font-display text-4xl leading-tight sm:text-5xl">
          {won ? (shell.guessCount === 1 ? "First try. Legendary." : "You got it!") : "Not this time"}
        </h2>
        <p className="mt-2 text-muted-foreground">
          {won
            ? `Solved in ${shell.guessCount} ${shell.guessCount === 1 ? "guess" : "guesses"} for ${shell.points} ${shell.points === 1 ? "point" : "points"}.`
            : "The song was:"}
        </p>
      </div>

      <div className="flex items-center gap-4 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        {answer.coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- remote artwork host varies by source
          <img
            src={answer.coverImageUrl.replace("100x100", "300x300")}
            alt={`Cover art for ${answer.album ?? answer.title}`}
            className="h-20 w-20 shrink-0 rounded-xl object-cover"
          />
        ) : (
          <div className="h-20 w-20 shrink-0 rounded-xl bg-gradient-to-br from-rani to-marigold" />
        )}
        <div className="min-w-0">
          <p className="truncate font-display text-2xl leading-tight">{answer.title}</p>
          <p className="truncate text-sm text-muted-foreground">
            {answer.artist}
            {answer.album ? `, ${answer.album}` : ""}
            {answer.year ? ` (${answer.year})` : ""}
          </p>
          {answer.externalUrl && (
            <a
              href={answer.externalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-peacock hover:underline"
            >
              Listen to the full song <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={share}
        className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-marigold px-6 font-bold text-primary-foreground shadow-[0_10px_40px_-10px_rgb(255_176_32/0.7)] transition-transform hover:-translate-y-0.5"
      >
        <Share2 className="h-4 w-4" />
        {copied ? "Copied to clipboard" : "Share your result"}
      </button>

      {stats && (
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            { label: "Played", value: stats.played },
            { label: "Win %", value: stats.winPercentage },
            { label: "Streak", value: stats.currentStreak },
            { label: "Points", value: stats.totalPoints },
          ].map((s) => (
            <div key={s.label} className="rounded-xl bg-white/5 py-3 ring-1 ring-white/8">
              <p className="font-display text-2xl leading-none">{s.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
            </div>
          ))}
          <p className="col-span-4 text-sm text-muted-foreground">
            You&apos;re a <span className="font-semibold text-marigold">{stats.rank.current.name}</span>
            {stats.rank.next ? `, ${stats.rank.winsToNext} more ${stats.rank.winsToNext === 1 ? "win" : "wins"} to ${stats.rank.next.name}.` : "."}
          </p>
        </div>
      )}

      <div className="flex flex-col items-center gap-2">
        {isToday && <Countdown timezone={timezone} />}
        <Link href="/archive" className="text-sm font-semibold text-peacock hover:underline">
          Play past songs from the archive
        </Link>
      </div>

      <AdSlot placement="result" className="mt-2" />
    </section>
  );
}
