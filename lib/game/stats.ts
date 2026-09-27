import { MAX_GUESSES, type AttemptStatus } from "./rules";
import { rankForWins, type RankProgress } from "./ranks";

// Stats are always derived from the attempt history instead of being
// incrementally mutated, so they can't drift and archive plays slot into
// the right place in the streak.
export interface AttemptSummary {
  puzzleNumber: number;
  status: AttemptStatus;
  guessCount: number;
  points: number;
  startedAt: Date;
  completedAt: Date | null;
  year: number | null;
  genre: string | null;
}

export interface PlayerStats {
  played: number;
  won: number;
  winPercentage: number;
  currentStreak: number;
  maxStreak: number;
  totalPoints: number;
  averagePoints: number;
  bestPoints: number;
  // index 0..5 = won on guess 1..6, index 6 = lost
  distribution: number[];
  rank: RankProgress;
}

export interface StatBucket {
  label: string;
  played: number;
  won: number;
  winPercentage: number;
  averagePoints: number;
}

export interface DeepStats {
  byDecade: StatBucket[];
  byGenre: StatBucket[];
  medianSolveSeconds: number | null;
}

const percentage = (part: number, whole: number) => (whole === 0 ? 0 : Math.floor((part / whole) * 100));

export function deriveStats(attempts: AttemptSummary[]): PlayerStats {
  const ordered = [...attempts].sort((x, y) => x.puzzleNumber - y.puzzleNumber);
  const distribution = new Array<number>(MAX_GUESSES + 1).fill(0);
  let played = 0;
  let won = 0;
  let streak = 0;
  let maxStreak = 0;
  let totalPoints = 0;
  let bestPoints = 0;

  // Reference semantics: win extends the streak, loss resets it, an
  // unplayed puzzle is simply absent, and an in-progress one counts as
  // played without affecting the streak.
  for (const attempt of ordered) {
    played += 1;
    if (attempt.status === "won") {
      won += 1;
      streak += 1;
      maxStreak = Math.max(maxStreak, streak);
      totalPoints += attempt.points;
      bestPoints = Math.max(bestPoints, attempt.points);
      distribution[Math.min(attempt.guessCount, MAX_GUESSES) - 1] += 1;
    } else if (attempt.status === "lost") {
      streak = 0;
      distribution[MAX_GUESSES] += 1;
    }
  }

  return {
    played,
    won,
    winPercentage: percentage(won, played),
    currentStreak: streak,
    maxStreak,
    totalPoints,
    averagePoints: won === 0 ? 0 : Math.round((totalPoints / won) * 100) / 100,
    bestPoints,
    distribution,
    rank: rankForWins(won),
  };
}

function bucketize(attempts: AttemptSummary[], labelOf: (a: AttemptSummary) => string): StatBucket[] {
  const groups = new Map<string, AttemptSummary[]>();
  for (const attempt of attempts) {
    const label = labelOf(attempt);
    groups.set(label, [...(groups.get(label) ?? []), attempt]);
  }
  return [...groups.entries()]
    .map(([label, group]) => {
      const wins = group.filter((x) => x.status === "won");
      const points = wins.reduce((sum, x) => sum + x.points, 0);
      return {
        label,
        played: group.length,
        won: wins.length,
        winPercentage: percentage(wins.length, group.length),
        averagePoints: group.length === 0 ? 0 : Math.round((points / group.length) * 100) / 100,
      };
    })
    .sort((x, y) => y.played - x.played || x.label.localeCompare(y.label));
}

export function deriveDeepStats(attempts: AttemptSummary[]): DeepStats {
  const finished = attempts.filter((x) => x.status !== "playing");
  const solveSeconds = finished
    .filter((x) => x.status === "won" && x.completedAt)
    .map((x) => (x.completedAt!.getTime() - x.startedAt.getTime()) / 1000)
    .sort((p, q) => p - q);
  const mid = Math.floor(solveSeconds.length / 2);
  const median =
    solveSeconds.length === 0
      ? null
      : solveSeconds.length % 2
        ? solveSeconds[mid]
        : (solveSeconds[mid - 1] + solveSeconds[mid]) / 2;

  return {
    byDecade: bucketize(finished, (x) => (x.year ? `${Math.floor(x.year / 10) * 10}s` : "Unknown")),
    byGenre: bucketize(finished, (x) => x.genre?.trim() || "Unknown"),
    medianSolveSeconds: median === null ? null : Math.round(median),
  };
}
