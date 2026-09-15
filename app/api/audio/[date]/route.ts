import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { songs } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getPuzzleForDate } from "@/lib/puzzle-service";
import { isFutureDate, isValidDateString, resolveDateParam } from "@/lib/date";

// Streams the preview clip for the puzzle on `date` through our own origin,
// so the underlying Deezer/iTunes URL (which can leak the track/artist name)
// is never visible to the client.
//
// The upstream preview is fully buffered (clips are ~200KB-1.5MB, so this is
// cheap) rather than piped through as a raw stream, because browsers'
// <audio> elements send a `Range` request on load and stall indefinitely if
// the response doesn't honor it with a proper 206 + Content-Length — a plain
// pass-through of the upstream chunked stream doesn't support that.
const previewCache = new Map<string, { contentType: string; buffer: Buffer }>();

// iTunes' CDN mislabels plain (non-DRM) AAC preview clips as `audio/x-m4p`
// (the MIME type for FairPlay-protected purchases), which browsers refuse
// to decode even though the bytes are ordinary playable M4A/AAC-LC audio.
// Normalize to a MIME type browsers actually know how to play.
function normalizeAudioContentType(upstreamType: string | null, sourceUrl: string): string {
  if (upstreamType === "audio/x-m4p" || /\.m4a(\?|$)/.test(sourceUrl)) {
    return "audio/mp4";
  }
  return upstreamType ?? "audio/mpeg";
}

async function fetchPreview(url: string): Promise<{ contentType: string; buffer: Buffer } | null> {
  const cached = previewCache.get(url);
  if (cached) return cached;

  const upstream = await fetch(url);
  if (!upstream.ok || !upstream.body) return null;

  const arrayBuffer = await upstream.arrayBuffer();
  const entry = {
    contentType: normalizeAudioContentType(upstream.headers.get("content-type"), url),
    buffer: Buffer.from(arrayBuffer),
  };
  previewCache.set(url, entry);
  return entry;
}

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

  const preview = await fetchPreview(song.previewUrl);
  if (!preview) {
    return NextResponse.json({ error: "Preview unavailable." }, { status: 502 });
  }

  const { buffer, contentType } = preview;
  const total = buffer.length;
  const range = req.headers.get("range");

  const baseHeaders = {
    "Content-Type": contentType,
    "Cache-Control": "public, max-age=86400",
    "Accept-Ranges": "bytes",
  };

  if (range) {
    const match = /bytes=(\d*)-(\d*)/.exec(range);
    const start = match?.[1] ? parseInt(match[1], 10) : 0;
    const end = match?.[2] ? parseInt(match[2], 10) : total - 1;
    const safeStart = Math.max(0, Math.min(start, total - 1));
    const safeEnd = Math.max(safeStart, Math.min(end, total - 1));

    const chunk = buffer.subarray(safeStart, safeEnd + 1);
    return new NextResponse(new Uint8Array(chunk), {
      status: 206,
      headers: {
        ...baseHeaders,
        "Content-Range": `bytes ${safeStart}-${safeEnd}/${total}`,
        "Content-Length": String(chunk.length),
      },
    });
  }

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      ...baseHeaders,
      "Content-Length": String(total),
    },
  });
}
