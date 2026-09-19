import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { userStats } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { roleForPoints } from "@/lib/roles";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const parsed = z.string().uuid().safeParse(deviceId);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid deviceId." }, { status: 400 });
  }

  const rows = await db
    .select()
    .from(userStats)
    .where(eq(userStats.deviceId, parsed.data))
    .limit(1);

  if (rows.length === 0) {
    return NextResponse.json({
      gamesPlayed: 0,
      gamesWon: 0,
      currentStreak: 0,
      maxStreak: 0,
      guessDistribution: [0, 0, 0, 0, 0, 0, 0],
      totalPoints: 0,
      lastPlayedDate: null,
      roleProgress: roleForPoints(0),
    });
  }

  return NextResponse.json({ ...rows[0], roleProgress: roleForPoints(rows[0].totalPoints) });
}
