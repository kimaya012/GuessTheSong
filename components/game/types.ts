export interface CatalogSong {
  id: string;
  title: string;
  artist: string;
  album: string | null;
  year: number | null;
}

export interface GuessRecord {
  songId: string;
  title: string;
  correct: boolean;
  attemptNumber: number;
  timestampMs: number;
  gaveUp?: boolean;
}

export interface PuzzleShell {
  puzzleNumber: number;
  date: string;
  maxAttempts: number;
  snippetDurationSec: number;
  currentScore: number;
  extendCost: number;
  revealedHints: Partial<Record<string, string | number | null>>;
  attemptsUsed: number;
  guesses: GuessRecord[];
  completed: boolean;
  won: boolean | null;
  pointsEarned?: number;
  answer?: {
    title: string;
    artist: string;
    album: string | null;
    year: number | null;
    genre: string | null;
    durationSec: number | null;
    coverImageUrl: string | null;
    externalUrl: string | null;
  };
}
