// Suggests names in the spirit of the game: an Indian music or cinema word,
// another one, and two digits, e.g. RangeelaTabla42. Plain editable lists on
// purpose; add words freely. Keep each word letters only, capitalised, and
// short enough that adjective + noun + 2 digits stays within the 20 character
// limit (the tests enforce that and run every pairing through the blocklist).
//
// Avoid words with a second meaning, regional or religious references, and
// anything that stereotypes a community.

export const ADJECTIVES = [
  "Rangeela",
  "Filmi",
  "Desi",
  "Sureela",
  "Mastana",
  "Bindaas",
  "Retro",
  "Golden",
  "Midnight",
  "Jhakaas",
  "Dilkash",
  "Sunehri",
  "Rockstar",
  "Groovy",
  "Melodic",
  "Peppy",
  "Masaledar",
  "Zabardast",
  "Shaandar",
  "Jaadui",
  "Toofani",
  "Electric",
  "Neon",
  "Velvet",
  "Cosmic",
  "Lucky",
  "Royal",
  "Nawabi",
  "Shahi",
  "Stylish",
  "Sparkly",
  "Vintage",
] as const;

export const NOUNS = [
  "Dholak",
  "Tabla",
  "Sitar",
  "Ghungroo",
  "Harmonium",
  "Jukebox",
  "Matinee",
  "Clapper",
  "Playback",
  "Cassette",
  "Mehfil",
  "Qawwal",
  "Sarangi",
  "Shehnai",
  "Bansuri",
  "Santoor",
  "Mridang",
  "Sargam",
  "Thumri",
  "Ghazal",
  "Dhun",
  "Bassline",
  "Interval",
  "Climax",
  "Hero",
  "Heroine",
  "Villain",
  "Director",
  "Producer",
  "Superstar",
  "Cameo",
  "Flashback",
  "Encore",
  "Chorus",
  "Trailer",
  "Reel",
  "Popcorn",
  "Ticket",
  "Balcony",
  "Marquee",
  "Screen",
  "Tempo",
  "Melody",
  "Rhythm",
  "Lyricist",
  "Composer",
] as const;

type Random = () => number;

const pick = <T>(list: readonly T[], rng: Random): T => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];

export function generateName(rng: Random = Math.random): string {
  const adjective = pick(ADJECTIVES, rng);
  const noun = pick(NOUNS, rng);
  const suffix = 10 + Math.min(89, Math.floor(rng() * 90)); // 10..99
  return `${adjective}${noun}${suffix}`;
}

// Up to `count` distinct names the caller considers acceptable (for example
// not already taken). Gives up quietly after enough attempts.
export function generateCandidates(
  count: number,
  rng: Random = Math.random,
  isAcceptable: (name: string) => boolean = () => true,
): string[] {
  const names: string[] = [];
  const seen = new Set<string>();
  for (let attempt = 0; attempt < count * 50 && names.length < count; attempt++) {
    const name = generateName(rng);
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    if (isAcceptable(name)) names.push(name);
  }
  return names;
}
