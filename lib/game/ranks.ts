// Listener ranks are earned by total wins (same thresholds as the reference
// game), named after Bollywood music culture.
export interface Rank {
  minWins: number;
  name: string;
}

export const RANKS: readonly Rank[] = [
  { minWins: 0, name: "Radio Rookie" },
  { minWins: 5, name: "Chai-Break Hummer" },
  { minWins: 10, name: "Antakshari Amateur" },
  { minWins: 20, name: "Bathroom Singer" },
  { minWins: 40, name: "Cassette Collector" },
  { minWins: 80, name: "Filmi Fanatic" },
  { minWins: 150, name: "Chartbuster Chaser" },
  { minWins: 200, name: "Playback Pundit" },
  { minWins: 250, name: "Raag Ranger" },
  { minWins: 300, name: "Ghazal Guru" },
  { minWins: 350, name: "Qawwali Connoisseur" },
  { minWins: 400, name: "Dance-Floor Detective" },
  { minWins: 430, name: "Background Score Sage" },
  { minWins: 470, name: "Golden-Era Guardian" },
  { minWins: 500, name: "Jukebox Jadugar" },
  { minWins: 530, name: "Retro Rhythm Rishi" },
  { minWins: 560, name: "Soundtrack Sultan" },
  { minWins: 600, name: "Sur Samrat" },
  { minWins: 630, name: "Gold Disc Holder" },
  { minWins: 700, name: "Platinum Disc Holder" },
  { minWins: 750, name: "Music Director's Pick" },
  { minWins: 800, name: "Award-Worthy Ear" },
  { minWins: 900, name: "Hall of Fame Listener" },
  { minWins: 1000, name: "Living Legend" },
  { minWins: 1100, name: "Sangeet Shiromani" },
  { minWins: 1300, name: "Eternal Antakshari Champion" },
];

export interface RankProgress {
  current: Rank;
  next: Rank | null;
  winsToNext: number | null;
}

export function rankForWins(wins: number): RankProgress {
  let index = 0;
  for (let i = 0; i < RANKS.length; i++) {
    if (wins >= RANKS[i].minWins) index = i;
  }
  const next = RANKS[index + 1] ?? null;
  return { current: RANKS[index], next, winsToNext: next ? next.minWins - wins : null };
}
