// Game rules, replicated from guesstheaudio.com's shipped game logic:
// 6 guesses, each unlocking a longer snippet and one more hint, scored
// max(0, 6 - r + 1) for a win on guess r and 0 for a loss.

export const MAX_GUESSES = 6;

// Seconds of audio audible before guess 1..6 (index = guesses already made).
export const SNIPPET_SECONDS = [0.4, 1, 2, 5, 7, 9] as const;

export type HintKey = "length" | "releaseYear" | "genre" | "album" | "artist";

// One hint unlocks after each guess made, least revealing first.
export const HINT_SCHEDULE: readonly HintKey[] = ["length", "releaseYear", "genre", "album", "artist"];

export type GuessKind = "skip" | "wrong" | "correct" | "giveup";

export interface GuessRecord {
  kind: GuessKind;
  songId: string | null;
  title: string;
  at: number; // epoch ms
}

export type AttemptStatus = "playing" | "won" | "lost";

export function snippetSecondsFor(guessCount: number): number {
  const index = Math.max(0, Math.min(guessCount, SNIPPET_SECONDS.length - 1));
  return SNIPPET_SECONDS[index];
}

export function hintsUnlocked(guessCount: number, completed: boolean): HintKey[] {
  if (completed) return [...HINT_SCHEDULE];
  return HINT_SCHEDULE.slice(0, Math.max(0, Math.min(guessCount, HINT_SCHEDULE.length)));
}

export function pointsFor(status: AttemptStatus, guessCount: number): number {
  if (status !== "won") return 0;
  return Math.max(0, MAX_GUESSES - guessCount + 1);
}

export interface AttemptState {
  guesses: GuessRecord[];
  status: AttemptStatus;
  guessCount: number;
  points: number;
}

export function nextState(prev: { guesses: GuessRecord[] }, guess: GuessRecord): AttemptState {
  const guesses = [...prev.guesses, guess];
  const guessCount = guesses.length;
  const status: AttemptStatus =
    guess.kind === "correct"
      ? "won"
      : guess.kind === "giveup" || guessCount >= MAX_GUESSES
        ? "lost"
        : "playing";
  return { guesses, status, guessCount, points: pointsFor(status, guessCount) };
}
