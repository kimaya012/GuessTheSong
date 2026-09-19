import "./load-env";
import { db } from "../lib/db";
import { songs } from "../db/schema";
import { eq, isNull, or } from "drizzle-orm";

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// One-off backfill: existing rows were ingested before `external_url` existed
// on the schema, so this looks each one back up by its stored track id to
// fill in a link to listen to the full song on its source platform.
async function main() {
  const rows = await db
    .select()
    .from(songs)
    .where(or(isNull(songs.externalUrl), eq(songs.externalUrl, "")));

  let updated = 0;
  for (const song of rows) {
    let url: string | null = null;

    if (song.previewSource === "deezer" && song.deezerTrackId) {
      url = `https://www.deezer.com/track/${song.deezerTrackId}`;
    } else if (song.previewSource === "itunes" && song.itunesTrackId) {
      try {
        const res = await fetch(`https://itunes.apple.com/lookup?id=${song.itunesTrackId}`);
        if (res.ok) {
          const data = (await res.json()) as { results?: { trackViewUrl?: string }[] };
          url = data.results?.[0]?.trackViewUrl ?? null;
        }
      } catch {
        url = null;
      }
      await sleep(200);
    }

    if (url) {
      await db.update(songs).set({ externalUrl: url }).where(eq(songs.id, song.id));
      updated++;
      console.log(`OK: ${song.title} -> ${url}`);
    } else {
      console.log(`SKIP (no url resolved): ${song.title}`);
    }
  }

  console.log(`\nDone. Updated ${updated} of ${rows.length}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
