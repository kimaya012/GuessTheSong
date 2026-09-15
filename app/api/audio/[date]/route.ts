import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { songs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPuzzleForDate } from "@/lib/puzzle-service";
import { isFutureDate, isValidDateString, resolveDateParam } from "@/lib/date";

// Streams the preview clip for the puzzle on `date` through our own origin,
// so the underlying Deezer/iTunes URL (which can leak the track/artist name)
// is never visible to the client.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ date: string }> },
) {
  const { date: rawDate } = await params;
  const date = resolveDateParam(rawDate);

  if (!isValidDateString(date)) {
    return NextResponse.json({ error: "Invalid date." }, { status: 400 });
  }
  if (isFutureDate(date)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const puzzle = await getPuzzleForDate(date);
  if (!puzzle) {
    return NextResponse.json({ error: "No puzzle for this date." }, { status: 404 });
  }

  const songRows = await db
    .select({ previewUrl: songs.previewUrl })
    .from(songs)
    .where(eq(songs.id, puzzle.songId))
    .limit(1);
  const song = songRows[0];
  if (!song) {
    return NextResponse.json({ error: "Song not found." }, { status: 404 });
  }

  const upstream = await fetch(song.previewUrl);
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: "Preview unavailable." }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "audio/mpeg",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
