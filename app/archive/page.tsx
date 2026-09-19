"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, X, Flag } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { AdSlot } from "@/components/ads/AdSlot";
import { useDeviceId } from "@/lib/hooks/useDeviceId";
import { cn } from "@/lib/utils";

interface ArchiveEntry {
  puzzleNumber: number;
  date: string;
  played: boolean;
  won: boolean | null;
  attemptsUsed: number | null;
  pointsEarned: number | null;
}

function ResultBadge({ entry }: { entry: ArchiveEntry }) {
  if (!entry.played) {
    return <span className="text-xs text-muted-foreground">Not played</span>;
  }
  if (entry.won) {
    return (
      <span className="inline-flex items-center gap-1 rounded border border-[--color-win] px-2 py-0.5 text-xs font-medium text-[--color-win]">
        <Check className="h-3 w-3" />
        {entry.attemptsUsed}/6 · {entry.pointsEarned?.toLocaleString()} pts
      </span>
    );
  }
  const gaveUp = entry.attemptsUsed != null && entry.attemptsUsed < 6;
  return (
    <span className="inline-flex items-center gap-1 rounded border border-secondary px-2 py-0.5 text-xs font-medium text-secondary">
      {gaveUp ? <Flag className="h-3 w-3" /> : <X className="h-3 w-3" />}
      {gaveUp ? "Gave up" : "Lost"}
    </span>
  );
}

export default function ArchivePage() {
  const deviceId = useDeviceId();
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!deviceId) return;
    fetch(`/api/archive?deviceId=${deviceId}`)
      .then((res) => res.json())
      .then((data) => setEntries(data.results ?? []))
      .finally(() => setLoading(false));
  }, [deviceId]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8">
      <h1 className="font-heading text-2xl text-foreground">Archive</h1>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No past puzzles yet — check back tomorrow.</p>
      )}

      <ul className="space-y-2">
        {entries.map((entry, i) => (
          <li key={entry.date}>
            <Link href={`/archive/${entry.date}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-center justify-between gap-3 py-4">
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "font-medium",
                        !entry.played && "text-muted-foreground",
                      )}
                    >
                      Puzzle #{entry.puzzleNumber}
                    </span>
                    <span className="text-sm text-muted-foreground">{entry.date}</span>
                  </div>
                  <ResultBadge entry={entry} />
                </CardContent>
              </Card>
            </Link>
            {(i + 1) % 8 === 0 && <AdSlot slotId="archive-list" className="mt-2" />}
          </li>
        ))}
      </ul>
    </main>
  );
}
