import { NextRequest, NextResponse } from "next/server";
import { buildPuzzleShell } from "@/lib/puzzle-service";
import { isFutureDate, isValidDateString, resolveDateParam } from "@/lib/date";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date: rawDate } = await params;
  const date = resolveDateParam(rawDate);
  const deviceId = req.nextUrl.searchParams.get("deviceId");

  if (!isValidDateString(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (isFutureDate(date)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const shell = await buildPuzzleShell(date, deviceId);
  if (!shell) {
    return NextResponse.json({ error: "No puzzle for this date." }, { status: 404 });
  }

  return NextResponse.json(shell);
}
