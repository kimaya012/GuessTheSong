import { normalizeText } from "@/lib/text";
import { cleanTitle } from "./seed";

function jaccard(a: string, b: string): number {
  const setA = new Set(a.split(" ").filter(Boolean));
  const setB = new Set(b.split(" ").filter(Boolean));
  const intersection = [...setA].filter((w) => setB.has(w)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

function titleScore(storeTitle: string, wanted: string): number {
  const s = normalizeText(cleanTitle(storeTitle));
  const w = normalizeText(wanted);
  if (!s || !w) return 0;
  if (s === w) return 1;
  // Store titles often wrap the name: "Challa (Kab Tak)", "Why This Kolaveri Di".
  if (` ${s} `.includes(` ${w} `)) return 0.85;
  // Otherwise only near-identical titles count; sharing a word or two
  // ("Tum Se Hi" vs "Tum Hi Ho") is a different song.
  const overlap = jaccard(s, w);
  return overlap >= 0.75 ? overlap : 0;
}

// A credit matches when it appears as whole words in the store's artist
// string ("Rabbi" in "Rabbi Shergill", "Vishal-Shekhar" in "Vishal & Shekhar").
function creditScore(storeArtist: string, credit: string): number {
  const s = ` ${normalizeText(storeArtist)} `;
  const c = normalizeText(credit);
  if (!c) return 0;
  if (s.includes(` ${c} `)) return 1;
  return jaccard(s.trim(), c);
}

// 0..1 confidence that a store track is the wanted song. Exportify credits
// composers and lyricists alongside singers, so any credit may match. A
// title match with no credited artist in common never counts.
export function matchScore(storeTitle: string, storeArtist: string, wantedTitle: string, credits: string[]): number {
  const artist = Math.max(0, ...credits.map((c) => creditScore(storeArtist, c)));
  if (artist < 0.25) return 0;
  return titleScore(storeTitle, wantedTitle) * 0.6 + artist * 0.4;
}

export const MATCH_THRESHOLD = 0.45;
