import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, dailyPuzzles, songs } from "@/db/schema";
import type { Viewer } from "@/lib/authz/policy";
import type { AttemptStatus } from "@/lib/game/rules";
import type { AttemptSummary } from "@/lib/game/stats";

export async function getAttemptSummaries(viewer: Viewer): Promise<AttemptSummary[]> {
  const owner = viewer.userId
    ? eq(attempts.userId, viewer.userId)
    : and(eq(attempts.deviceId, viewer.deviceId), isNull(attempts.userId));

  const rows = await db
    .select({
      puzzleNumber: dailyPuzzles.puzzleNumber,
      status: attempts.status,
      guessCount: attempts.guessCount,
      points: attempts.points,
      startedAt: attempts.startedAt,
      completedAt: attempts.completedAt,
      year: songs.year,
      genre: songs.genre,
    })
    .from(attempts)
    .innerJoin(dailyPuzzles, eq(dailyPuzzles.id, attempts.puzzleId))
    .innerJoin(songs, eq(songs.id, dailyPuzzles.songId))
    .where(owner);

  // A row is created on the first guess, so every attempt has been "played".
  return rows.map((r) => ({ ...r, status: r.status as AttemptStatus }));
}
