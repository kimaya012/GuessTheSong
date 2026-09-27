// Client-side view of API payloads. Type-only imports from server modules
// are erased at compile time, so no server code reaches the bundle.
export type { PuzzleShell, PuzzleAnswer } from "@/lib/services/puzzles";
export type { GuessRecord, GuessKind, HintKey, AttemptStatus } from "@/lib/game/rules";
export type { PlayerStats } from "@/lib/game/stats";

export interface CatalogSong {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
}
