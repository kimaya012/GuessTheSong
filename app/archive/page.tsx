"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { AdSlot } from "@/components/ads/AdSlot";

interface ArchiveEntry {
  puzzleNumber: number;
  date: string;
}

export default function ArchivePage() {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/archive")
      .then((res) => res.json())
      .then((data) => setEntries(data.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Archive</h1>
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          Today&apos;s puzzle
        </Link>
      </header>

      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {!loading && entries.length === 0 && (
        <p className="text-sm text-muted-foreground">No past puzzles yet — check back tomorrow.</p>
      )}

      <ul className="space-y-2">
        {entries.map((entry, i) => (
          <li key={entry.date}>
            <Link href={`/archive/${entry.date}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardContent className="flex items-center justify-between py-4">
                  <span className="font-medium">Puzzle #{entry.puzzleNumber}</span>
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
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
