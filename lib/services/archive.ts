import { and, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { attempts, dailyPuzzles } from "@/db/schema";
import { puzzleAccess, type Viewer } from "@/lib/authz/policy";
import type { AttemptStatus, GuessKind, GuessRecord } from "@/lib/game/rules";

export const ARCHIVE_PAGE_SIZE = 30;

export interface ArchiveEntry {
  puzzleNumber: number;
  date: string;
  status: AttemptStatus | null; // null = unplayed
  guessKinds: GuessKind[];
  points: number;
  locked: boolean;
}

export async function listArchive(
  viewer: Viewer,
  today: string,
  page: number,
): Promise<{ entries: ArchiveEntry[]; hasMore: boolean }> {
  const owner = viewer.userId
    ? eq(attempts.userId, viewer.userId)
    : and(eq(attempts.deviceId, viewer.deviceId), isNull(attempts.userId));

  const rows = await db
    .select({
      puzzleNumber: dailyPuzzles.puzzleNumber,
      date: dailyPuzzles.date,
      status: attempts.status,
      guesses: attempts.guesses,
      points: attempts.points,
    })
    .from(dailyPuzzles)
    .leftJoin(attempts, and(eq(attempts.puzzleId, dailyPuzzles.id), owner))
    .where(lt(dailyPuzzles.date, today))
    .orderBy(desc(dailyPuzzles.date))
    .limit(ARCHIVE_PAGE_SIZE + 1)
    .offset((Math.max(1, page) - 1) * ARCHIVE_PAGE_SIZE);

  const entries = rows.slice(0, ARCHIVE_PAGE_SIZE).map((r) => ({
    puzzleNumber: r.puzzleNumber,
    date: r.date,
    status: (r.status as AttemptStatus | null) ?? null,
    guessKinds: ((r.guesses as GuessRecord[] | null) ?? []).map((g) => g.kind),
    points: r.points ?? 0,
    locked: puzzleAccess(viewer, r.date, today) === "premium_required",
  }));
  return { entries, hasMore: rows.length > ARCHIVE_PAGE_SIZE };
}

export async function countArchive(today: string): Promise<number> {
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(dailyPuzzles)
    .where(lt(dailyPuzzles.date, today));
  return row?.n ?? 0;
}
