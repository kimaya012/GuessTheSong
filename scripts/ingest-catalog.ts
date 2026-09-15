import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { db } from "../lib/db";
import { songs } from "../db/schema";
import { eq } from "drizzle-orm";

interface SeedRow {
  title: string;
  artist: string;
  hint_album?: string;
  hint_year?: string;
  hint_genre?: string;
}

interface ResolvedSong {
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
  genre: string | null;
  durationSec: number | null;
  deezerTrackId: string | null;
  itunesTrackId: string | null;
  previewUrl: string;
  previewSource: "deezer" | "itunes";
  coverImageUrl: string | null;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  const setA = new Set(na.split(/\s+/));
  const setB = new Set(nb.split(/\s+/));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function parseCsv(content: string): SeedRow[] {
  const lines = content.trim().split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  return lines.slice(1).map((line) => {
    // Simple CSV split; seed data has no embedded commas in quotes.
    const values = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row as unknown as SeedRow;
  });
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  duration?: number;
  artist?: { name?: string };
  album?: { title?: string; cover_medium?: string };
}

interface ItunesTrack {
  trackId: number;
  trackName: string;
  artistName?: string;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  artworkUrl100?: string;
}

async function searchDeezer(title: string, artist: string): Promise<ResolvedSong | null> {
  const query = `track:"${title}" artist:"${artist}"`;
  const url = `https://api.deezer.com/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { data?: DeezerTrack[] };
  const candidates = data.data ?? [];
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    const score =
      similarity(c.title, title) * 0.6 + similarity(c.artist?.name ?? "", artist) * 0.4;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (bestScore < 0.3 || !best.preview) return null;

  return {
    title: best.title,
    artist: best.artist?.name ?? artist,
    album: best.album?.title ?? null,
    year: null,
    genre: null,
    durationSec: best.duration ?? null,
    deezerTrackId: String(best.id),
    itunesTrackId: null,
    previewUrl: best.preview,
    previewSource: "deezer",
    coverImageUrl: best.album?.cover_medium ?? null,
  };
}

async function searchItunes(title: string, artist: string): Promise<ResolvedSong | null> {
  const term = `${title} ${artist}`;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    term,
  )}&media=music&country=IN&limit=10`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = (await res.json()) as { results?: ItunesTrack[] };
  const candidates = data.results ?? [];
  if (candidates.length === 0) return null;

  let best = candidates[0];
  let bestScore = -1;
  for (const c of candidates) {
    const score =
      similarity(c.trackName ?? "", title) * 0.6 +
      similarity(c.artistName ?? "", artist) * 0.4;
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  if (bestScore < 0.3 || !best.previewUrl) return null;

  const year = best.releaseDate ? new Date(best.releaseDate).getFullYear() : null;

  return {
    title: best.trackName,
    artist: best.artistName ?? artist,
    album: best.collectionName ?? null,
    year,
    genre: best.primaryGenreName ?? null,
    durationSec: best.trackTimeMillis ? Math.round(best.trackTimeMillis / 1000) : null,
    deezerTrackId: null,
    itunesTrackId: String(best.trackId),
    previewUrl: best.previewUrl,
    previewSource: "itunes",
    coverImageUrl: best.artworkUrl100 ?? null,
  };
}

async function verifyPreviewReachable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return false;
    const contentType = res.headers.get("content-type") ?? "";
    return contentType.startsWith("audio") || contentType === "application/octet-stream";
  } catch {
    return false;
  }
}

async function main() {
  const csvPath = path.join(__dirname, "data", "seed-song-list.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const rows = parseCsv(content);

  const unresolved: SeedRow[] = [];
  let inserted = 0;
  let skipped = 0;

  for (const row of rows) {
    const title = row.title?.trim();
    const artist = row.artist?.trim();
    if (!title || !artist) continue;

    process.stdout.write(`Resolving "${title}" by ${artist}... `);

    let resolved = await searchDeezer(title, artist);
    if (!resolved) {
      resolved = await searchItunes(title, artist);
    }

    if (!resolved) {
      console.log("NOT FOUND");
      unresolved.push(row);
      skipped++;
      await sleep(250);
      continue;
    }

    const reachable = await verifyPreviewReachable(resolved.previewUrl);
    if (!reachable) {
      console.log("PREVIEW UNREACHABLE");
      unresolved.push(row);
      skipped++;
      await sleep(250);
      continue;
    }

    const finalRow = {
      title: resolved.title,
      titleNormalized: normalize(resolved.title),
      artist: resolved.artist,
      album: resolved.album ?? row.hint_album ?? null,
      year: resolved.year ?? (row.hint_year ? Number(row.hint_year) : null),
      genre: resolved.genre ?? row.hint_genre ?? null,
      durationSec: resolved.durationSec,
      deezerTrackId: resolved.deezerTrackId,
      spotifyTrackId: null,
      itunesTrackId: resolved.itunesTrackId,
      previewUrl: resolved.previewUrl,
      previewSource: resolved.previewSource,
      coverImageUrl: resolved.coverImageUrl,
      active: true,
    };

    if (resolved.deezerTrackId) {
      const existing = await db
        .select({ id: songs.id })
        .from(songs)
        .where(eq(songs.deezerTrackId, resolved.deezerTrackId))
        .limit(1);
      if (existing.length > 0) {
        console.log("ALREADY EXISTS");
        await sleep(250);
        continue;
      }
    }

    await db.insert(songs).values(finalRow);
    console.log(`OK (${resolved.previewSource})`);
    inserted++;
    await sleep(250);
  }

  console.log(`\nDone. Inserted ${inserted}, skipped ${skipped}.`);

  if (unresolved.length > 0) {
    const unresolvedPath = path.join(__dirname, "data", "unresolved-songs.csv");
    const header = "title,artist,hint_album,hint_year,hint_genre\n";
    const body = unresolved
      .map(
        (r) =>
          `${r.title},${r.artist},${r.hint_album ?? ""},${r.hint_year ?? ""},${r.hint_genre ?? ""}`,
      )
      .join("\n");
    fs.writeFileSync(unresolvedPath, header + body);
    console.log(`Wrote ${unresolved.length} unresolved rows to ${unresolvedPath}`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
