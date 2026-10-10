import { describe, expect, it } from "vitest";
import { parseCsv, parseCsvObjects, toCsvLine } from "@/lib/catalog/csv";

describe("parseCsv (RFC 4180)", () => {
  it("handles quoted commas, escaped quotes, CRLF and a BOM", () => {
    const text = '﻿name,artists\r\n"Koi Vi Nahi, Dasi Na","A ""B"" C"\r\nplain,x\r\n';
    expect(parseCsv(text)).toEqual([
      ["name", "artists"],
      ["Koi Vi Nahi, Dasi Na", 'A "B" C'],
      ["plain", "x"],
    ]);
  });

  it("keeps newlines inside quoted fields and skips blank lines", () => {
    expect(parseCsv('a,b\n"line1\nline2",2\n\n')).toEqual([
      ["a", "b"],
      ["line1\nline2", "2"],
    ]);
  });

  it("maps rows to objects by header, ignoring malformed rows", () => {
    expect(parseCsvObjects("t,y\nTum Hi Ho,2013\nbroken\n")).toEqual([{ t: "Tum Hi Ho", y: "2013" }]);
  });
});

describe("toCsvLine", () => {
  it("quotes only when needed and round-trips", () => {
    const line = toCsvLine(["Tere Liye", 'Say "hi", ok', ""]);
    expect(line).toBe('Tere Liye,"Say ""hi"", ok",');
    expect(parseCsv(line)[0]).toEqual(["Tere Liye", 'Say "hi", ok', ""]);
  });
});
