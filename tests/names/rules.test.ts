import { describe, expect, it } from "vitest";
import { NAME_MAX_LENGTH, NAME_MIN_LENGTH, checkNameFormat, nameKey } from "@/lib/names/rules";

describe("checkNameFormat", () => {
  it("accepts letters and numbers, 3 to 20 characters", () => {
    expect(NAME_MIN_LENGTH).toBe(3);
    expect(NAME_MAX_LENGTH).toBe(20);
    for (const ok of ["Rahul", "RangeelaTabla42", "abc", "a1b", "X".repeat(20), "Aarav2010"]) {
      expect(checkNameFormat(ok)).toEqual({ ok: true, name: ok });
    }
  });

  it("trims surrounding whitespace but keeps the typed casing", () => {
    expect(checkNameFormat("  DesiBeat9  ")).toEqual({ ok: true, name: "DesiBeat9" });
  });

  it("rejects names that are too short or too long", () => {
    expect(checkNameFormat("")).toEqual({ ok: false, reason: "TOO_SHORT" });
    expect(checkNameFormat("   ")).toEqual({ ok: false, reason: "TOO_SHORT" });
    expect(checkNameFormat("ab")).toEqual({ ok: false, reason: "TOO_SHORT" });
    expect(checkNameFormat("a".repeat(21))).toEqual({ ok: false, reason: "TOO_LONG" });
  });

  it("rejects anything that is not a plain letter or number", () => {
    for (const bad of ["Desi Beat", "Desi_Beat", "Desi-Beat", "Rahul!", "देसी123", "Ra​hul", "Rahül", "a.b.c"]) {
      expect(checkNameFormat(bad)).toEqual({ ok: false, reason: "BAD_CHARACTERS" });
    }
  });

  it("rejects names made only of symbols", () => {
    for (const bad of ["!!!", "@@@@@@", "____", "***###"]) {
      expect(checkNameFormat(bad)).toEqual({ ok: false, reason: "BAD_CHARACTERS" });
    }
  });

  it("rejects names made only of numbers", () => {
    for (const bad of ["123", "0000000", "20102010"]) {
      expect(checkNameFormat(bad)).toEqual({ ok: false, reason: "NEEDS_LETTER" });
    }
  });
});

describe("nameKey", () => {
  it("ignores case so two names that differ only by case collide", () => {
    expect(nameKey("RangeelaTabla42")).toBe("rangeelatabla42");
    expect(nameKey("RANGEELATABLA42")).toBe(nameKey("rangeelaTabla42"));
  });
});
