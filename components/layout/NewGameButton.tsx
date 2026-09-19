"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ArchiveEntry {
  puzzleNumber: number;
  date: string;
}

// This is a daily-puzzle game, so there's no literal "new game" to deal —
// instead this jumps the player into a random past puzzle from the archive,
// giving them something fresh to play right now instead of waiting for
// tomorrow's daily drop.
export function NewGameButton() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function startNewGame() {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch("/api/archive");
      const data: { results?: ArchiveEntry[] } = await res.json();
      const entries = data.results ?? [];
      if (entries.length === 0) {
        router.push("/");
        return;
      }
      const pick = entries[Math.floor(Math.random() * entries.length)];
      router.push(`/archive/${pick.date}`);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      variant="default"
      size="sm"
      onClick={startNewGame}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Shuffle className="h-4 w-4" />}
      <span className="hidden sm:inline">New Game</span>
    </Button>
  );
}
