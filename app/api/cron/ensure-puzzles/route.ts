import { timingSafeEqual } from "node:crypto";
import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { dailyPuzzles, puzzleClips, songs } from "@/db/schema";
import { addDays, todayInTz } from "@/lib/date";
import { env } from "@/lib/env";
import { jsonError, jsonOk } from "@/lib/http";

const HORIZON_DAYS = 90;
const CLIP_CHECK_DAYS = 14;

function authorized(header: string | null): boolean {
  const secret = env().CRON_SECRET;
  if (!secret || !header) return false;
  const expected = Buffer.from(`Bearer ${secret}`);
  const provided = Buffer.from(header);
  return expected.length === provided.length && timingSafeEqual(expected, provided);
}

// Hit daily by Vercel Cron. A safety net, not the generation path: reports
// whether the schedule is topped up, which upcoming puzzles lack a pre-cut
// clip, and which songs were deactivated after being scheduled.
export async function GET(req: Request) {
  if (!authorized(req.headers.get("authorization"))) return jsonError("UNAUTHORIZED", 401);

  const today = todayInTz();
  const upcoming = await db
    .select({ date: dailyPuzzles.date, active: songs.active, clip: puzzleClips.puzzleId })
    .from(dailyPuzzles)
    .innerJoin(songs, eq(songs.id, dailyPuzzles.songId))
    .leftJoin(puzzleClips, eq(puzzleClips.puzzleId, dailyPuzzles.id))
    .where(gte(dailyPuzzles.date, today));

  const soon = await db
    .select({ date: dailyPuzzles.date })
    .from(dailyPuzzles)
    .leftJoin(puzzleClips, eq(puzzleClips.puzzleId, dailyPuzzles.id))
    .where(
      and(gte(dailyPuzzles.date, today), lte(dailyPuzzles.date, addDays(today, CLIP_CHECK_DAYS)), isNull(puzzleClips.puzzleId)),
    );

  const horizonOk = upcoming.length >= HORIZON_DAYS;
  return jsonOk({
    today,
    daysCovered: upcoming.length,
    horizonOk,
    missingClipDates: soon.map((r) => r.date),
    inactiveSongDates: upcoming.filter((r) => !r.active).map((r) => r.date),
    note: horizonOk ? undefined : "Puzzle horizon is running low — run `npm run puzzles:generate`.",
  });
}
