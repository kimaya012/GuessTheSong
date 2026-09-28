import { describe, expect, it } from "vitest";
import { buildShareText } from "@/lib/game/share";
import type { GuessRecord } from "@/lib/game/rules";

const g = (kind: GuessRecord["kind"]): GuessRecord => ({ kind, songId: null, title: "", at: 0 });

describe("share text", () => {
  const base = {
    puzzleNumber: 12,
    guesses: [g("skip"), g("wrong"), g("correct")],
    status: "won" as const,
    url: "https://guessthebollysong.com",
  };

  it("renders one square per guess slot", () => {
    const text = buildShareText({ ...base, premium: false });
    const lines = text.split("\n");
    expect(lines[0]).toBe("#GuessTheBollySong #12");
    expect(text).toContain("🔊 ⬛ 🟥 🟩 ⬜ ⬜ ⬜");
    expect(text).toContain("https://guessthebollysong.com");
    expect(text).not.toContain("👑");
  });

  it("marks a loss and a give-up", () => {
    const text = buildShareText({ ...base, guesses: [g("wrong"), g("giveup")], status: "lost", premium: false });
    expect(text).toContain("🔊 🟥 🏳️ ⬜ ⬜ ⬜ ⬜");
  });

  it("adds a crown for Premium players", () => {
    expect(buildShareText({ ...base, premium: true })).toContain("👑");
  });
});
