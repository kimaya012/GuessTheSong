export const SNIPPET_TIMINGS = [1, 2, 4, 7, 11, 16] as const;
export const MAX_ATTEMPTS = SNIPPET_TIMINGS.length;

// Order hints unlock in, least revealing first. One hint unlocks per skip
// (before attempts 2-6); attempt 1 has no hint yet, just the 1s snippet.
export const HINT_REVEAL_ORDER = [
  "genre",
  "releaseYear",
  "duration",
  "album",
  "artist",
] as const;

export type HintKey = (typeof HINT_REVEAL_ORDER)[number];

export function hintsUnlockedForAttempt(attemptNumber: number): HintKey[] {
  // attemptNumber is 1-indexed (the attempt about to be made).
  // Before attempt 1: no hints. Before attempt N (N>1): first (N-1) hints.
  const count = Math.max(0, Math.min(attemptNumber - 1, HINT_REVEAL_ORDER.length));
  return HINT_REVEAL_ORDER.slice(0, count);
}

export function snippetDurationForAttempt(attemptNumber: number): number {
  const index = Math.max(0, Math.min(attemptNumber - 1, SNIPPET_TIMINGS.length - 1));
  return SNIPPET_TIMINGS[index];
}
