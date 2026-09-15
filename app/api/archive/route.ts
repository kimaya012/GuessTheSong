import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { dailyPuzzles } from "@/db/schema";
import { lt, desc } from "drizzle-orm";
import { todayUtcString } from "@/lib/date";

const PAGE_SIZE = 30;

export async function GET(req: NextRequest) {
  const page = Math.max(1, Number(req.nextUrl.searchParams.get("page") ?? "1"));
  const today = todayUtcString();

  const rows = await db
    .select({ puzzleNumber: dailyPuzzles.puzzleNumber, date: dailyPuzzles.date })
    .from(dailyPuzzles)
    .where(lt(dailyPuzzles.date, today))
    .orderBy(desc(dailyPuzzles.date))
    .limit(PAGE_SIZE)
    .offset((page - 1) * PAGE_SIZE);

  return NextResponse.json({ page, pageSize: PAGE_SIZE, results: rows });
}
