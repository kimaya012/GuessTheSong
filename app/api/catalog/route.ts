import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { songs } from "@/db/schema";
import { eq } from "drizzle-orm";

// Not statically generated at build time (needs a live DB connection);
// cached at the edge/browser for a few hours instead since the catalog only
// changes when the ingestion script runs.
export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db
    .select({
      id: songs.id,
      title: songs.title,
      artist: songs.artist,
      album: songs.album,
      year: songs.year,
    })
    .from(songs)
    .where(eq(songs.active, true));

  return NextResponse.json(rows, {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
