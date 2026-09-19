// 6 attempts total. Each skip/wrong guess unlocks the next metadata hint AND
// bumps the snippet up to that attempt's duration floor — both on the same
// per-attempt schedule below. This is what makes skipping have a real cost:
// previously duration/points were only spent through the manual +1s button,
// so a player could skip through every hint for free. Now every non-winning
// attempt costs points (exponentially, so stalling gets expensive fast) and
// grows the snippet for free (since you already paid for it in points).
export const MAX_ATTEMPTS = 6;

// Snippet duration floor unlocked after N attempts (index 0 = before any
// attempt). Capped at 10s for the last two attempts.
export const SNIPPET_TIMINGS = [1, 3, 5, 7, 10, 10, 10] as const;

export const STARTING_SCORE = 10000;

// Points lost for the Nth non-winning attempt (1-indexed): 500, 1000, 2000,
// 4000, 8000 — doubling each time. Never applied to the attempt that wins,
// and never applied on give-up (which already earns 0).
const SKIP_BASE_PENALTY = 500;

export function skipPenaltyForAttempt(attemptNumber: number): number {
  return SKIP_BASE_PENALTY * 2 ** (attemptNumber - 1);
}

export function snippetDurationAfterAttempts(attemptsUsed: number): number {
  const index = Math.max(0, Math.min(attemptsUsed, SNIPPET_TIMINGS.length - 1));
  return SNIPPET_TIMINGS[index];
}

// The manual "+1s" button — a separate, on-demand way to buy extra seconds
// beyond whatever skipping has already unlocked, at a flat cost per second.
export const EXTEND_COST = 2500;
export const EXTEND_SECONDS = 1;
export const DEFAULT_SNIPPET_DURATION_SEC = SNIPPET_TIMINGS[0];

// Order hints unlock in, least revealing first. One hint unlocks per skip
// (before attempts 2-6); attempt 1 has no hint yet, just the 1s snippet.
// No "genre" hint here — every song in this game is Bollywood, so it never
// narrows anything down.
export const HINT_REVEAL_ORDER = [
  "releaseYear",
  "duration",
  "album",
  "artist",
  "firstLetter",
] as const;

export type HintKey = (typeof HINT_REVEAL_ORDER)[number];

export function hintsUnlockedForAttempt(attemptNumber: number): HintKey[] {
  // attemptNumber is 1-indexed (the attempt about to be made).
  // Before attempt 1: no hints. Before attempt N (N>1): first (N-1) hints.
  const count = Math.max(0, Math.min(attemptNumber - 1, HINT_REVEAL_ORDER.length));
  return HINT_REVEAL_ORDER.slice(0, count);
}
