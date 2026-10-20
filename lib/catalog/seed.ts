import { normalizeText } from "@/lib/text";

// A song to look up on the preview APIs, plus curated hints that take
// priority over whatever metadata the API returns.
export interface SeedRow {
  title: string;
  artist: string;
  credits?: string[]; // every credited name (singers, composer, lyricist)
  hint_album?: string;
  hint_year?: string;
  hint_genre?: string;
}

const TITLE_NOISE = [
  /\s*\((?:from|feat\.?|ft\.?|with)\b[^)]*\)/gi, // (From "Film"), (feat. X)
  /\s*\[[^\]]*\]/g, // [anything]
  /\s+-\s+from\s+.*$/i, // - From "Film"
  /,\s*pt\.?\s*\d+.*$/i, // , Pt. 1
  /\s*[-(]\s*(?:male|female)(?:\s+version)?\)?\s*$/i, // - Male / (Female Version)
];

export function cleanTitle(title: string): string {
  let out = title;
  for (let pass = 0; pass < 2; pass++) {
    for (const pattern of TITLE_NOISE) out = out.replace(pattern, "");
  }
  return out.replace(/\s+/g, " ").trim();
}

export function cleanAlbum(album: string): string {
  return album
    .replace(/\s*[(\[-]?\s*(?:original\s+)?(?:motion\s+picture\s+)?soundtrack\s*[)\]]?\s*$/i, "")
    .replace(/\s*\(from\s+"[^"]*"\)\s*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

const VARIANT = /\b(?:remix|reprise|unplugged|lo-?fi|slowed|sped\s*up|mashup|8d|instrumental|karaoke|reverb)\b/i;

export interface AudioFeatures {
  danceability: number;
  energy: number;
  valence: number;
}

// Spotify's genres are per artist ("bollywood" for nearly everything), so
// the in-game "vibe" hint is derived from the track's audio features.
// Thresholds were set from the distribution of the Bollywood playlists
// (median danceability .65, energy .74, valence .62).
export function vibeFor(f: AudioFeatures, artistGenres: string, hipHopPlaylist: boolean): string | null {
  if (hipHopPlaylist || /\b(?:hip hop|rap|drill)\b/i.test(artistGenres)) return "Hip-Hop";
  if ([f.danceability, f.energy, f.valence].some((v) => Number.isNaN(v))) return null;
  if (f.danceability >= 0.72 && f.valence >= 0.7) return "Party";
  if (f.valence <= 0.35) return "Heartbreak";
  if (f.energy <= 0.5) return "Soft";
  if (f.danceability >= 0.72) return "Dance";
  return "Melodic";
}

// Converts an Exportify playlist export into seed rows: lead artist only
// (Exportify also lists composers and lyricists), cleaned film/album name,
// release year, derived vibe; remix variants and duplicates dropped.
export function exportifyToSeed(rows: Record<string, string>[], options: { hipHop: boolean }): SeedRow[] {
  const seen = new Set<string>();
  const out: SeedRow[] = [];
  for (const r of rows) {
    const rawTitle = r["Track Name"] ?? "";
    if (!rawTitle || VARIANT.test(rawTitle)) continue;
    const title = cleanTitle(rawTitle);
    const credits = (r["Artist Name(s)"] ?? "").split(/[;,]/).map((a) => a.trim()).filter(Boolean);
    const artist = credits[0] ?? "";
    if (!title || !artist) continue;

    const key = `${normalizeText(title)}|${normalizeText(artist)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const year = (r["Release Date"] ?? "").slice(0, 4);
    const vibe = vibeFor(
      { danceability: parseFloat(r.Danceability), energy: parseFloat(r.Energy), valence: parseFloat(r.Valence) },
      r.Genres ?? "",
      options.hipHop,
    );
    out.push({
      title,
      artist,
      credits,
      hint_album: cleanAlbum(r["Album Name"] ?? ""),
      hint_year: /^(19|20)\d\d$/.test(year) ? year : "",
      hint_genre: vibe ?? "",
    });
  }
  return out;
}
