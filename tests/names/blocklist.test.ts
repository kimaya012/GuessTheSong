import { describe, expect, it } from "vitest";
import { isNameAllowed } from "@/lib/names/blocklist";

describe("isNameAllowed", () => {
  it("allows ordinary names, including real names that contain risky letter runs", () => {
    const fine = [
      "RangeelaTabla42",
      "Rahul",
      "Kshitij", // contains "shit" in the middle
      "Nazia",
      "Nazim", // start with "nazi"
      "Randhir",
      "Randika",
      "Gandhi",
      "Chandu",
      "Bhosale",
      "Kuttappan",
      "Hiteshwar",
      "Peacock",
      "Classic",
      "Scunthorpe",
      "Blunder",
      "Grapes",
      "Bassline",
      "Assam",
      "Essex",
    ];
    for (const name of fine) expect([name, isNameAllowed(name)]).toEqual([name, true]);
  });

  it("rejects abusive words, however casually they are disguised", () => {
    const bad = [
      "fuck",
      "FuCK99",
      "xxfuckxx",
      "fuuuck",
      "f1u2c3k", // digits slipped between letters
      "b1tch",
      "biiitch",
      "sh1tHead", // starts with a leet-spelled word
      "BullShit",
      "MadarCh0d",
      "Bhench0d",
      "Chutiya123",
      "Cunt42",
    ];
    for (const name of bad) expect([name, isNameAllowed(name)]).toEqual([name, false]);
  });

  it("rejects short words only when they are the whole name", () => {
    expect(isNameAllowed("Ass")).toBe(false);
    expect(isNameAllowed("sex")).toBe(false);
    expect(isNameAllowed("Nazi")).toBe(false);
    expect(isNameAllowed("Bass")).toBe(true);
    expect(isNameAllowed("Sexton")).toBe(true);
  });

  it("rejects reserved and official-sounding names", () => {
    for (const name of ["admin", "Admin", "ADMIN1", "AdminRahul", "Support", "moderator", "GuessTheBollySong", "staff42", "Official", "null", "undefined"]) {
      expect([name, isNameAllowed(name)]).toEqual([name, false]);
    }
  });
});
