import { describe, expect, it } from "vitest";
import {
  HINT_SCHEDULE,
  hintsUnlocked,
  nextState,
  pointsFor,
  snippetSecondsFor,
  type GuessRecord,
} from "@/lib/game/rules";
import { RANKS, rankForWins } from "@/lib/game/ranks";

const g = (kind: GuessRecord["kind"]): GuessRecord => ({
  kind,
  songId: kind === "skip" || kind === "giveup" ? null : "song",
  title: kind,
  at: 0,
});

describe("points (reference formula: max(0, 6 - r + 1))", () => {
  it("awards 6 for a first-guess win down to 1 for a sixth-guess win", () => {
    expect([1, 2, 3, 4, 5, 6].map((r) => pointsFor("won", r))).toEqual([6, 5, 4, 3, 2, 1]);
  });
  it("awards nothing for losses or unfinished games", () => {
    expect(pointsFor("lost", 6)).toBe(0);
    expect(pointsFor("playing", 2)).toBe(0);
  });
});

describe("snippet schedule", () => {
  it("follows 0.4 / 1 / 2 / 5 / 7 / 9 seconds and caps at 9", () => {
    expect([0, 1, 2, 3, 4, 5].map(snippetSecondsFor)).toEqual([0.4, 1, 2, 5, 7, 9]);
    expect(snippetSecondsFor(9)).toBe(9);
  });
});

describe("hints", () => {
  it("unlock one per guess made, in reference order", () => {
    expect(hintsUnlocked(0, false)).toEqual([]);
    expect(hintsUnlocked(1, false)).toEqual(["length"]);
    expect(hintsUnlocked(5, false)).toEqual([...HINT_SCHEDULE]);
    expect(HINT_SCHEDULE).toEqual(["length", "releaseYear", "genre", "album", "artist"]);
  });
  it("are all revealed once the game is over", () => {
    expect(hintsUnlocked(1, true)).toEqual([...HINT_SCHEDULE]);
  });
});

describe("nextState", () => {
  it("wins on a correct guess and scores by guess number", () => {
    let s = nextState({ guesses: [] }, g("skip"));
    s = nextState(s, g("wrong"));
    s = nextState(s, g("correct"));
    expect(s).toMatchObject({ status: "won", guessCount: 3, points: 4 });
  });
  it("loses after the sixth miss", () => {
    let s = { guesses: [] as GuessRecord[] };
    for (let i = 0; i < 5; i++) s = nextState(s, g("wrong"));
    expect(nextState(s, g("skip"))).toMatchObject({ status: "lost", guessCount: 6, points: 0 });
  });
  it("treats giving up as a loss", () => {
    expect(nextState({ guesses: [] }, g("giveup"))).toMatchObject({ status: "lost", points: 0 });
  });
  it("keeps playing while guesses remain", () => {
    expect(nextState({ guesses: [] }, g("wrong"))).toMatchObject({ status: "playing", guessCount: 1 });
  });
});

describe("ranks (by total wins)", () => {
  it("uses the reference thresholds", () => {
    expect(RANKS.map((r) => r.minWins)).toEqual([
      0, 5, 10, 20, 40, 80, 150, 200, 250, 300, 350, 400, 430, 470, 500, 530, 560, 600, 630, 700, 750,
      800, 900, 1000, 1100, 1300,
    ]);
  });
  it("reports current rank and wins to the next", () => {
    expect(rankForWins(0).current).toBe(RANKS[0]);
    expect(rankForWins(5).current.minWins).toBe(5);
    expect(rankForWins(7).winsToNext).toBe(3);
    expect(rankForWins(1300).next).toBeNull();
    expect(rankForWins(1300).winsToNext).toBeNull();
  });
});
