import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyPuzzles, songs } from "@/db/schema";
import { eq, gte } from "drizzle-orm";
import { todayUtcString } from "@/lib/date";

const HORIZON_DAYS = 90;

// Hit daily by Vercel Cron. Verifies the puzzle horizon is topped up and
// flags any upcoming puzzle whose song preview has gone dead so it can be
// caught before it goes live. Does not itself pick songs — that idempotent
// logic lives in scripts/generate-puzzles.ts; this route is a safety-net
// check, not the primary generation path (run that script directly for now).
// Vercel Cron invokes this route with a GET request.
export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const today = todayUtcString();
  const upcoming = await db
    .select({ date: dailyPuzzles.date, songId: dailyPuzzles.songId })
    .from(dailyPuzzles)
    .where(gte(dailyPuzzles.date, today));

  const horizonEnd = new Date();
  horizonEnd.setUTCDate(horizonEnd.getUTCDate() + HORIZON_DAYS);
  const daysCovered = upcoming.length;
  const horizonOk = daysCovered >= HORIZON_DAYS;

  const deadSongDates: string[] = [];
  for (const row of upcoming) {
    const songRows = await db
      .select({ active: songs.active, previewUrl: songs.previewUrl })
      .from(songs)
      .where(eq(songs.id, row.songId))
      .limit(1);
    const song = songRows[0];
    if (!song || !song.active) {
      deadSongDates.push(row.date);
      continue;
    }
    try {
      const res = await fetch(song.previewUrl, { method: "HEAD" });
      if (!res.ok) deadSongDates.push(row.date);
    } catch {
      deadSongDates.push(row.date);
    }
  }

  return NextResponse.json({
    today,
    daysCovered,
    horizonOk,
    deadSongDates,
    note: horizonOk
      ? undefined
      : "Puzzle horizon is running low — run `npm run puzzles:generate`.",
  });
}
