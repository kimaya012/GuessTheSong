import { describe, expect, it } from "vitest";
import { matchScore } from "@/lib/catalog/match";

describe("matchScore", () => {
  it("accepts a match on any credited artist, not just the first", () => {
    // Exportify lists the composer first; iTunes credits the singers.
    const credits = ["Vishal-Shekhar", "Akon", "Hamsika Iyer"];
    expect(matchScore('Chammak Challo (From "Ra-One")', "Akon & Hamsika Iyer", "Chammak Challo", credits)).toBeGreaterThan(0.9);
  });

  it("tolerates subtitles on the store's track name", () => {
    expect(matchScore("Challa (Kab Tak)", "Rabbi Shergill", "Challa", ["A.R. Rahman", "Rabbi", "Gulzar"])).toBeGreaterThan(0.45);
  });

  it("rejects a same-titled song by unrelated artists", () => {
    expect(matchScore("Superstar", "Someone Else", "Superstar", ["dox", "JASKARAN"])).toBe(0);
  });

  it("rejects a different song by the right artist", () => {
    expect(matchScore("Ishq Dance", "A.R. Rahman", "Challa", ["A.R. Rahman"])).toBeLessThan(0.45);
    // shares words but is another Pritam song
    expect(matchScore("Tum Se Hi", "Pritam & Mohit Chauhan", "Tum Hi Ho", ["Pritam"])).toBeLessThan(0.45);
  });

  it("accepts the wanted title embedded in a longer store title", () => {
    expect(matchScore("Why This Kolaveri Di - 3", "Anirudh Ravichander & Dhanush", "Kolaveri Di", ["Dhanush"])).toBeGreaterThan(0.45);
  });
});
