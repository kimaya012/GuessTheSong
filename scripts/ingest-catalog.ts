import "./load-env";
import fs from "node:fs";
import path from "node:path";
import { db } from "../lib/db";
import { songs } from "../db/schema";
import { parseCsvObjects, toCsvLine } from "../lib/catalog/csv";
import { cleanAlbum, cleanTitle, exportifyToSeed, type SeedRow } from "../lib/catalog/seed";
import { normalizeText } from "../lib/text";
import { MATCH_THRESHOLD, matchScore } from "../lib/catalog/match";

// Builds the song catalog from:
//   scripts/data/seed-song-list.csv   hand-curated rows (title,artist,hint_*)
//   scripts/data/exportify/*.csv      Spotify playlist exports from exportify.net
//                                     (a file name containing "hip hop"/"rap"
//                                     marks the whole playlist as Hip-Hop)
// Each song is resolved to a playable preview on iTunes (Deezer as fallback;
// it's geo-blocked from India and its preview links expire). Curated hints
// win over API metadata. Songs already in the catalog are skipped, so it is
// safe to re-run after adding rows. Failures go to unresolved-songs.csv.

const DATA_DIR = path.join(__dirname, "data");
const EXPORTIFY_DIR = path.join(DATA_DIR, "exportify");
const DELAY_MS = Number(process.env.INGEST_DELAY_MS ?? 3000); // iTunes allows ~20 searches/min

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
  externalUrl: string | null;
}

interface ItunesTrack {
  kind?: string;
  trackId: number;
  trackName: string;
  artistName?: string;
  collectionName?: string;
  releaseDate?: string;
  primaryGenreName?: string;
  trackTimeMillis?: number;
  previewUrl?: string;
  artworkUrl100?: string;
  trackViewUrl?: string;
}

interface DeezerTrack {
  id: number;
  title: string;
  preview: string;
  link?: string;
  duration?: number;
  artist?: { name?: string };
  album?: { title?: string; cover_medium?: string };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const creditsOf = (row: SeedRow) => (row.credits?.length ? row.credits : [row.artist]);

// Transient failures (throttling, 5xx, network) are retried with backoff so
// they aren't mistaken for "song not found".
async function fetchJson<T>(url: string): Promise<T | null> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const res = await fetch(url);
      if (res.ok) return (await res.json()) as T;
      if (res.status !== 403 && res.status !== 429 && res.status < 500) return null;
    } catch {
      // network error: retry
    }
    await sleep(2000 * 2 ** attempt);
  }
  return null;
}

// Tries progressively broader searches: title + lead artist, then the title
// alone (the lead credit is often the composer), then the US store (newer
// independent releases are frequently missing from the Indian store).
async function searchItunes(row: SeedRow): Promise<ResolvedSong | null> {
  const queries: [string, string][] = [
    [`${row.title} ${row.artist}`, "IN"],
    [row.title, "IN"],
    [`${row.title} ${row.artist}`, "US"],
  ];
  for (const [i, [term, country]] of queries.entries()) {
    if (i > 0) await sleep(DELAY_MS / 2);
    // entity=song excludes music videos, whose previews are video files.
    const data = await fetchJson<{ results?: ItunesTrack[] }>(
      `https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&country=${country}&limit=25`,
    );
    let best: ItunesTrack | null = null;
    let bestScore = MATCH_THRESHOLD;
    for (const c of data?.results ?? []) {
      if (c.kind !== "song" || !c.previewUrl) continue;
      const s = matchScore(c.trackName ?? "", c.artistName ?? "", row.title, creditsOf(row));
      if (s > bestScore) {
        bestScore = s;
        best = c;
      }
    }
    if (best?.previewUrl) {
      return {
        title: cleanTitle(best.trackName),
        artist: best.artistName ?? row.artist,
        album: best.collectionName ? cleanAlbum(best.collectionName) : null,
        year: best.releaseDate ? new Date(best.releaseDate).getFullYear() : null,
        genre: null, // iTunes labels nearly everything "Bollywood"
        durationSec: best.trackTimeMillis ? Math.round(best.trackTimeMillis / 1000) : null,
        deezerTrackId: null,
        itunesTrackId: String(best.trackId),
        previewUrl: best.previewUrl,
        previewSource: "itunes",
        coverImageUrl: best.artworkUrl100 ?? null,
        externalUrl: best.trackViewUrl ?? null,
      };
    }
  }
  return null;
}

async function searchDeezer(row: SeedRow): Promise<ResolvedSong | null> {
  const query = encodeURIComponent(`track:"${row.title}" artist:"${row.artist}"`);
  const data = await fetchJson<{ data?: DeezerTrack[] }>(`https://api.deezer.com/search?q=${query}`);
  let best: DeezerTrack | null = null;
  let bestScore = MATCH_THRESHOLD;
  for (const c of data?.data ?? []) {
    const s = matchScore(c.title, c.artist?.name ?? "", row.title, creditsOf(row));
    if (c.preview && s > bestScore) {
      bestScore = s;
      best = c;
    }
  }
  if (!best) return null;
  return {
    title: cleanTitle(best.title),
    artist: best.artist?.name ?? row.artist,
    album: best.album?.title ? cleanAlbum(best.album.title) : null,
    year: null,
    genre: null,
    durationSec: best.duration ?? null,
    deezerTrackId: String(best.id),
    itunesTrackId: null,
    previewUrl: best.preview,
    previewSource: "deezer",
    coverImageUrl: best.album?.cover_medium ?? null,
    externalUrl: best.link ?? `https://www.deezer.com/track/${best.id}`,
  };
}

async function previewPlayable(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: "HEAD" });
    const type = res.headers.get("content-type") ?? "";
    return res.ok && (type.startsWith("audio/") || type === "application/octet-stream");
  } catch {
    return false;
  }
}

function loadSeedRows(): SeedRow[] {
  const rows: SeedRow[] = [];
  const curated = path.join(DATA_DIR, "seed-song-list.csv");
  if (fs.existsSync(curated)) {
    for (const r of parseCsvObjects(fs.readFileSync(curated, "utf8"))) {
      rows.push({ title: r.title, artist: r.artist, hint_album: r.hint_album, hint_year: r.hint_year, hint_genre: r.hint_genre });
    }
    console.log(`Curated seed list: ${rows.length} songs`);
  }
  if (fs.existsSync(EXPORTIFY_DIR)) {
    for (const file of fs.readdirSync(EXPORTIFY_DIR).filter((f) => f.toLowerCase().endsWith(".csv"))) {
      const hipHop = /hip.?hop|\brap\b/i.test(file);
      const converted = exportifyToSeed(parseCsvObjects(fs.readFileSync(path.join(EXPORTIFY_DIR, file), "utf8")), { hipHop });
      console.log(`Exportify ${file}: ${converted.length} songs${hipHop ? " (Hip-Hop)" : ""}`);
      rows.push(...converted);
    }
  }
  // Same song in several sources: keep the first (curated rows come first).
  const seen = new Set<string>();
  return rows.filter((r) => {
    const key = `${normalizeText(r.title ?? "")}|${normalizeText(r.artist ?? "")}`;
    if (!r.title || !r.artist || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const seeds = loadSeedRows();
  const existing = await db
    .select({ title: songs.title, artist: songs.artist, itunesTrackId: songs.itunesTrackId, deezerTrackId: songs.deezerTrackId })
    .from(songs);
  const knownIds = new Set(existing.flatMap((s) => [s.itunesTrackId, s.deezerTrackId]).filter(Boolean));
  const knownSongs = existing.map((s) => ({ title: normalizeText(s.title), artist: normalizeText(s.artist) }));
  const alreadyHave = (r: SeedRow) =>
    knownSongs.some((k) => k.title === normalizeText(r.title) && k.artist.includes(normalizeText(r.artist)));

  const todo = seeds.filter((r) => !alreadyHave(r));
  console.log(`${seeds.length} unique songs across sources; ${seeds.length - todo.length} already in the catalog; resolving ${todo.length}.\n`);

  const unresolved: (SeedRow & { reason: string })[] = [];
  let inserted = 0;

  for (const [i, row] of todo.entries()) {
    process.stdout.write(`[${i + 1}/${todo.length}] "${row.title}" by ${row.artist}... `);
    const resolved = (await searchItunes(row)) ?? (await searchDeezer(row));

    if (!resolved) {
      console.log("NOT FOUND");
      unresolved.push({ ...row, reason: "no matching track with a preview" });
    } else if (knownIds.has(resolved.itunesTrackId ?? resolved.deezerTrackId)) {
      console.log("ALREADY EXISTS");
    } else if (!(await previewPlayable(resolved.previewUrl))) {
      console.log("PREVIEW UNPLAYABLE");
      unresolved.push({ ...row, reason: "preview not playable audio" });
    } else {
      const year = row.hint_year ? Number(row.hint_year) : resolved.year;
      await db.insert(songs).values({
        title: resolved.title,
        titleNormalized: normalizeText(resolved.title),
        artist: resolved.artist,
        album: row.hint_album || resolved.album,
        year: Number.isFinite(year) ? year : null,
        genre: row.hint_genre || resolved.genre,
        durationSec: resolved.durationSec,
        deezerTrackId: resolved.deezerTrackId,
        spotifyTrackId: null,
        itunesTrackId: resolved.itunesTrackId,
        previewUrl: resolved.previewUrl,
        previewSource: resolved.previewSource,
        externalUrl: resolved.externalUrl,
        coverImageUrl: resolved.coverImageUrl,
        active: true,
      });
      knownIds.add(resolved.itunesTrackId ?? resolved.deezerTrackId);
      inserted++;
      console.log(`OK → ${resolved.title} (${resolved.previewSource})`);
    }
    await sleep(DELAY_MS);
  }

  console.log(`\nDone. Inserted ${inserted}, unresolved ${unresolved.length}.`);
  const header = toCsvLine(["title", "artist", "hint_album", "hint_year", "hint_genre", "reason"]);
  const body = unresolved.map((r) =>
    toCsvLine([r.title, r.artist, r.hint_album ?? "", r.hint_year ?? "", r.hint_genre ?? "", r.reason]),
  );
  fs.writeFileSync(path.join(DATA_DIR, "unresolved-songs.csv"), [header, ...body].join("\n") + "\n");
  if (unresolved.length) console.log(`Unresolved rows written to scripts/data/unresolved-songs.csv`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
