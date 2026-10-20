import { describe, expect, it } from "vitest";
import { albumHint } from "@/lib/game/hints";

describe("albumHint", () => {
  it("shows the film or album when it doesn't give the answer away", () => {
    expect(albumHint("Ilahi", "Yeh Jawaani Hai Deewani")).toBe("Yeh Jawaani Hai Deewani");
  });
  it("hides an album that repeats the song title", () => {
    expect(albumHint("Ring A Rose", "Ring A Rose")).toBe("Title track");
    expect(albumHint("Kal Ho Naa Ho", "Kal Ho Naa Ho (Original Motion Picture Soundtrack)")).toBe("Title track");
    expect(albumHint("Kahani", 'Kahani (From "Kahani")')).toBe("Title track");
  });
  it("passes through a missing album", () => {
    expect(albumHint("Anything", null)).toBeNull();
  });
});
