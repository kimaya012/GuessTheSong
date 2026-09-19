import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyPuzzles, attempts } from "@/db/schema";
import { lt, desc, eq, and, sql } from "drizzle-orm";
import { todayUtcString } from "@/lib/date";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const today = todayUtcString();

  // When there's no deviceId, join against an impossible condition so every
  // row comes back with a null attempt — same shape either way.
  const joinCondition = deviceId
    ? and(eq(attempts.puzzleId, dailyPuzzles.id), eq(attempts.deviceId, deviceId))
    : and(eq(attempts.puzzleId, dailyPuzzles.id), sql`false`);

  const rows = await db
    .select({
      puzzleNumber: dailyPuzzles.puzzleNumber,
      date: dailyPuzzles.date,
      completed: attempts.completedAt,
      won: attempts.won,
      attemptsUsed: attempts.attemptsUsed,
      pointsEarned: attempts.currentScore,
    })
    .from(dailyPuzzles)
    .leftJoin(attempts, joinCondition)
    .where(lt(dailyPuzzles.date, today))
    .orderBy(desc(dailyPuzzles.date))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  const results = rows.map((r) => ({
    puzzleNumber: r.puzzleNumber,
    date: r.date,
    played: r.completed != null,
    won: r.completed != null ? r.won : null,
    attemptsUsed: r.completed != null ? r.attemptsUsed : null,
    pointsEarned: r.completed != null && r.won ? r.pointsEarned : null,
  }));

  return NextResponse.json({ page, pageSize: PAGE_SIZE, results });
}
