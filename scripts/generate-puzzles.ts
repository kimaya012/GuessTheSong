import "./load-env";
import { db } from "../lib/db";
import { songs, dailyPuzzles } from "../db/schema";
import { eq } from "drizzle-orm";
import { addDays, todayInTz } from "../lib/date";
import { prepareMissingClips } from "./prepare-clips";

// How many days ahead the puzzle horizon should be kept topped up.
const DEFAULT_HORIZON_DAYS = 90;
// Don't reuse a song within this many days of its last use (or ever, if the
// catalog is smaller than this window's worth of songs).
const NO_REPEAT_WINDOW_DAYS = 180;

function toDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// Deterministic PRNG seeded from a string (mulberry32), so re-running this
// script with the same catalog+date range is idempotent. The seed is never
// derivable from anything shipped to the client.
function seededShuffle<T>(arr: T[], seed: string): T[] {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  let state = h >>> 0;
  const random = () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

async function main() {
  const horizonDays = Number(process.env.PUZZLE_HORIZON_DAYS ?? DEFAULT_HORIZON_DAYS);

  const existing = await db
    .select({ date: dailyPuzzles.date, songId: dailyPuzzles.songId, puzzleNumber: dailyPuzzles.puzzleNumber })
    .from(dailyPuzzles);

  const existingDates = new Set(existing.map((r) => r.date));
  const maxPuzzleNumber = existing.reduce((max, r) => Math.max(max, r.puzzleNumber), 0);

  // Puzzle days follow PUZZLE_TIMEZONE. PUZZLE_BACKFILL_DAYS (default 0) also
  // fills past days, giving a fresh database an archive to browse; it only
  // applies to an empty schedule, so numbering always follows date order.
  const todayStr = todayInTz();
  const today = new Date(`${todayStr}T00:00:00Z`);
  const backfillDays = existing.length === 0 ? Number(process.env.PUZZLE_BACKFILL_DAYS ?? 0) : 0;

  const targetDates: string[] = [];
  for (let i = -backfillDays; i < horizonDays; i++) {
    const ds = addDays(todayStr, i);
    if (!existingDates.has(ds)) targetDates.push(ds);
  }

  if (targetDates.length === 0) {
    console.log(`Puzzle horizon already covers the next ${horizonDays} days.`);
    await reportClips();
    return;
  }

  const activeSongs = await db
    .select({ id: songs.id })
    .from(songs)
    .where(eq(songs.active, true));

  if (activeSongs.length === 0) {
    throw new Error("No active songs in catalog — run ingest-catalog.ts first.");
  }

  // Recently-used songs (within the no-repeat window) should be avoided if
  // the catalog is large enough to do so.
  const cutoff = new Date(today);
  cutoff.setUTCDate(cutoff.getUTCDate() - NO_REPEAT_WINDOW_DAYS);
  const cutoffStr = toDateString(cutoff);
  const recentlyUsedIds = new Set(
    existing.filter((r) => r.date >= cutoffStr).map((r) => r.songId),
  );

  let pool = activeSongs.map((s) => s.id).filter((id) => !recentlyUsedIds.has(id));
  if (pool.length < targetDates.length) {
    // Not enough non-repeated songs to fill the horizon — fall back to the
    // full active catalog (repeats allowed) rather than failing.
    pool = activeSongs.map((s) => s.id);
  }

  const seed = `${process.env.CRON_SECRET ?? "dev-seed"}:${toDateString(today)}`;
  const shuffled = seededShuffle(pool, seed);

  const rowsToInsert = targetDates.map((date, i) => ({
    puzzleNumber: maxPuzzleNumber + i + 1,
    date,
    songId: shuffled[i % shuffled.length],
  }));

  await db.insert(dailyPuzzles).values(rowsToInsert);

  console.log(`Generated ${rowsToInsert.length} puzzles from ${targetDates[0]} to ${targetDates[targetDates.length - 1]}.`);
  await reportClips();
}

async function reportClips() {
  const { prepared, failed } = await prepareMissingClips();
  console.log(`Prepared ${prepared} snippet clips.${failed.length ? ` Failed for: ${failed.join(", ")}` : ""}`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
