import { NextRequest, NextResponse } from "next/server";
import { buildPuzzleShell } from "@/lib/puzzle-service";
import { todayUtcString } from "@/lib/date";

export async function GET(req: NextRequest) {
  const deviceId = req.nextUrl.searchParams.get("deviceId");
  const date = todayUtcString();

  const shell = await buildPuzzleShell(date, deviceId);
  if (!shell) {
    return NextResponse.json(
      { error: "No puzzle configured for today yet." },
      { status: 404 },
    );
  }

  return NextResponse.json(shell);
}
