"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useDeviceId } from "@/lib/hooks/useDeviceId";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Stats {
  gamesPlayed: number;
  gamesWon: number;
  currentStreak: number;
  maxStreak: number;
  guessDistribution: number[];
  lastPlayedDate: string | null;
}

export default function StatsPage() {
  const deviceId = useDeviceId();
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    if (!deviceId) return;
    fetch(`/api/stats?deviceId=${deviceId}`)
      .then((res) => res.json())
      .then(setStats);
  }, [deviceId]);

  const winPct = stats && stats.gamesPlayed > 0 ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100) : 0;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your stats</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Today&apos;s puzzle
        </Link>
      </header>

      {!stats && <p className="text-sm text-muted-foreground">Loading…</p>}

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-3 text-center">
            <StatBox label="Played" value={stats.gamesPlayed} />
            <StatBox label="Win %" value={winPct} />
            <StatBox label="Streak" value={stats.currentStreak} />
            <StatBox label="Max streak" value={stats.maxStreak} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Guess distribution</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1">
              {stats.guessDistribution.map((count, i) => {
                const label = i === 6 ? "X" : String(i + 1);
                const max = Math.max(1, ...stats.guessDistribution);
                return (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-muted-foreground">{label}</span>
                    <div
                      className="h-5 rounded bg-primary text-right text-xs text-primary-foreground"
                      style={{ width: `${Math.max(8, (count / max) * 100)}%` }}
                    >
                      <span className="px-1">{count}</span>
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </>
      )}
      <p className="text-xs text-muted-foreground">
        Stats are saved to this browser only. Create an account (coming soon) to sync across
        devices.
      </p>
    </main>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
