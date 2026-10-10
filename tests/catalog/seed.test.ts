import { describe, expect, it } from "vitest";
import { cleanAlbum, cleanTitle, exportifyToSeed, vibeFor } from "@/lib/catalog/seed";

const track = (overrides: Record<string, string>) => ({
  "Track Name": "Song",
  "Album Name": "Album",
  "Artist Name(s)": "Lead Singer;Composer;Lyricist",
  "Release Date": "2013-05-01",
  Popularity: "60",
  Genres: "bollywood,hindi pop",
  Danceability: "0.6",
  Energy: "0.8",
  Valence: "0.5",
  ...overrides,
});

describe("title and album cleaning", () => {
  it("strips film credits, part numbers and version tags from titles", () => {
    expect(cleanTitle('Teri Khushboo (From "Mr. X") - Male')).toBe("Teri Khushboo");
    expect(cleanTitle("Toh Phir Aao, Pt. 1")).toBe("Toh Phir Aao");
    expect(cleanTitle('Pyar Karda - From "Lover"')).toBe("Pyar Karda");
    expect(cleanTitle("Vail (feat. Nimrat Khaira & Shree Brar)")).toBe("Vail");
    expect(cleanTitle("Tere Liye")).toBe("Tere Liye");
  });

  it("strips soundtrack suffixes from album names", () => {
    expect(cleanAlbum("Prince (Original Motion Picture Soundtrack)")).toBe("Prince");
    expect(cleanAlbum("Jab Tak Hai Jaan")).toBe("Jab Tak Hai Jaan");
  });
});

describe("vibeFor", () => {
  const f = (d: number, e: number, v: number) => ({ danceability: d, energy: e, valence: v });
  it("classifies hip-hop by playlist or artist genre first", () => {
    expect(vibeFor(f(0.9, 0.9, 0.9), "bollywood", true)).toBe("Hip-Hop");
    expect(vibeFor(f(0.9, 0.9, 0.9), "desi hip hop,punjabi pop", false)).toBe("Hip-Hop");
  });
  it("uses valence and danceability for Bollywood moods", () => {
    expect(vibeFor(f(0.742, 0.879, 0.936), "bollywood", false)).toBe("Party"); // Chammak Challo
    expect(vibeFor(f(0.576, 0.735, 0.301), "bollywood", false)).toBe("Heartbreak"); // Teri Yaadon Mein
    expect(vibeFor(f(0.65, 0.482, 0.517), "bollywood", false)).toBe("Soft"); // Samjhawan
    expect(vibeFor(f(0.776, 0.795, 0.569), "bollywood", false)).toBe("Dance"); // Challa
    expect(vibeFor(f(0.593, 0.967, 0.452), "bollywood", false)).toBe("Melodic"); // Ilahi
  });
  it("returns null without audio features", () => {
    expect(vibeFor({ danceability: NaN, energy: NaN, valence: NaN }, "bollywood", false)).toBeNull();
  });
});

describe("exportifyToSeed", () => {
  it("converts rows using the lead artist, film name, year and derived vibe", () => {
    const [row] = exportifyToSeed(
      [track({ "Track Name": "Tere Liye", "Album Name": "Prince (Original Motion Picture Soundtrack)", "Release Date": "2010-04-09" })],
      { hipHop: false },
    );
    expect(row).toEqual({
      title: "Tere Liye",
      artist: "Lead Singer",
      credits: ["Lead Singer", "Composer", "Lyricist"],
      hint_album: "Prince",
      hint_year: "2010",
      hint_genre: "Melodic",
    });
  });

  it("drops remixes and duplicates, and blanks impossible years", () => {
    const rows = exportifyToSeed(
      [
        track({ "Track Name": "Woh Lamhe - Remix" }),
        track({ "Track Name": "Sini Ne Sini Ne (Remix)" }),
        track({ "Track Name": "Pani Da Rang - Male" }),
        track({ "Track Name": "Pani Da Rang" }),
        track({ "Track Name": "Old Dates", "Release Date": "0000" }),
      ],
      { hipHop: true },
    );
    expect(rows.map((r) => r.title)).toEqual(["Pani Da Rang", "Old Dates"]);
    expect(rows[1].hint_year).toBe("");
    expect(rows[0].hint_genre).toBe("Hip-Hop");
  });
});
