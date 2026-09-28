import "./load-env";
import { eq, isNull } from "drizzle-orm";
import { db } from "../lib/db";
import { dailyPuzzles, puzzleClips, songs } from "../db/schema";
import { transcodeFirstSeconds } from "../lib/audio/transcode";
import { mp3DurationSeconds } from "../lib/audio/mp3";

// Pre-cuts the 9s snippet for every scheduled puzzle that doesn't have one
// yet. Idempotent; safe to re-run. Also called by generate-puzzles.
export async function prepareMissingClips(): Promise<{ prepared: number; failed: string[] }> {
  const missing = await db
    .select({ puzzleId: dailyPuzzles.id, date: dailyPuzzles.date, previewUrl: songs.previewUrl, title: songs.title })
    .from(dailyPuzzles)
    .innerJoin(songs, eq(songs.id, dailyPuzzles.songId))
    .leftJoin(puzzleClips, eq(puzzleClips.puzzleId, dailyPuzzles.id))
    .where(isNull(puzzleClips.puzzleId))
    .orderBy(dailyPuzzles.date);

  let prepared = 0;
  const failed: string[] = [];
  for (const row of missing) {
    process.stdout.write(`Clip for ${row.date}... `);
    try {
      const bytes = await transcodeFirstSeconds(row.previewUrl, 9);
      const seconds = mp3DurationSeconds(bytes);
      if (seconds < 8.5) throw new Error(`clip too short (${seconds.toFixed(2)}s)`);
      await db
        .insert(puzzleClips)
        .values({ puzzleId: row.puzzleId, bytes: Buffer.from(bytes) })
        .onConflictDoNothing();
      prepared++;
      console.log(`OK (${(bytes.length / 1024).toFixed(0)} KB, ${seconds.toFixed(2)}s)`);
    } catch (err) {
      failed.push(row.date);
      console.log(`FAILED: ${err instanceof Error ? err.message : err}`);
    }
  }
  return { prepared, failed };
}

if (process.argv[1]?.includes("prepare-clips")) {
  prepareMissingClips()
    .then(({ prepared, failed }) => {
      console.log(`\nPrepared ${prepared} clips.${failed.length ? ` Failed: ${failed.join(", ")}` : ""}`);
      process.exit(failed.length ? 1 : 0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
