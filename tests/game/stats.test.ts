import { describe, expect, it } from "vitest";
import { deriveDeepStats, deriveStats, type AttemptSummary } from "@/lib/game/stats";
import { RANKS } from "@/lib/game/ranks";

let seq = 0;
function a(
  puzzleNumber: number,
  status: AttemptSummary["status"],
  guessCount: number,
  extra: Partial<AttemptSummary> = {},
): AttemptSummary {
  const points = status === "won" ? 7 - guessCount : 0;
  const startedAt = new Date(Date.UTC(2026, 0, 1, 0, 0, seq++));
  return {
    puzzleNumber,
    status,
    guessCount,
    points,
    startedAt,
    completedAt: status === "playing" ? null : new Date(startedAt.getTime() + 60_000),
    year: null,
    genre: null,
    ...extra,
  };
}

describe("deriveStats", () => {
  it("is all zeros with the first rank for a new player", () => {
    const s = deriveStats([]);
    expect(s).toMatchObject({
      played: 0,
      won: 0,
      winPercentage: 0,
      currentStreak: 0,
      maxStreak: 0,
      totalPoints: 0,
      averagePoints: 0,
      bestPoints: 0,
      distribution: [0, 0, 0, 0, 0, 0, 0],
    });
    expect(s.rank.current).toBe(RANKS[0]);
  });

  it("follows reference semantics regardless of input order; gaps don't break streaks", () => {
    // Puzzles: 1 W(1), 2 W(3), [3 unplayed], 4 L, 5 W(2), 6 W(6)
    const s = deriveStats([a(6, "won", 6), a(1, "won", 1), a(4, "lost", 6), a(5, "won", 2), a(2, "won", 3)]);
    expect(s).toMatchObject({
      played: 5,
      won: 4,
      winPercentage: 80,
      currentStreak: 2,
      maxStreak: 2,
      totalPoints: 6 + 4 + 5 + 1,
      bestPoints: 6,
      averagePoints: 4,
      distribution: [1, 1, 1, 0, 0, 1, 1],
    });
  });

  it("counts an in-progress game as played without touching the streak", () => {
    const s = deriveStats([a(1, "won", 2), a(2, "playing", 3), a(3, "won", 1)]);
    expect(s.played).toBe(3);
    expect(s.currentStreak).toBe(2);
    expect(s.winPercentage).toBe(66);
  });
});

describe("deriveDeepStats", () => {
  it("buckets by decade and genre and reports the median solve time of wins", () => {
    const deep = deriveDeepStats([
      a(1, "won", 1, { year: 1994, genre: "Romantic" }),
      a(2, "lost", 6, { year: 1998, genre: "Romantic" }),
      a(3, "won", 3, { year: null, genre: null }),
      a(4, "playing", 2, { year: 2010, genre: "Item" }),
    ]);
    const nineties = deep.byDecade.find((b) => b.label === "1990s");
    expect(nineties).toMatchObject({ played: 2, won: 1, winPercentage: 50, averagePoints: 3 });
    expect(deep.byDecade.some((b) => b.label === "Unknown")).toBe(true);
    // in-progress games are excluded from deep stats
    expect(deep.byDecade.some((b) => b.label === "2010s")).toBe(false);
    expect(deep.byGenre.find((b) => b.label === "Romantic")?.played).toBe(2);
    expect(deep.medianSolveSeconds).toBe(60);
  });

  it("has no median without wins", () => {
    expect(deriveDeepStats([a(1, "lost", 6)]).medianSolveSeconds).toBeNull();
  });
});
