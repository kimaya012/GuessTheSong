import { describe, expect, it } from "vitest";
import { ADJECTIVES, NOUNS, generateCandidates, generateName } from "@/lib/names/generator";
import { NAME_MAX_LENGTH, checkNameFormat } from "@/lib/names/rules";
import { isNameAllowed } from "@/lib/names/blocklist";

describe("word lists", () => {
  it("have no duplicates and only plain letters", () => {
    for (const list of [ADJECTIVES, NOUNS]) {
      expect(new Set(list.map((w) => w.toLowerCase())).size).toBe(list.length);
      for (const word of list) expect(word).toMatch(/^[A-Z][a-z]+$/);
    }
  });

  it("always leave room for a two-digit suffix", () => {
    const longestAdjective = Math.max(...ADJECTIVES.map((w) => w.length));
    const longestNoun = Math.max(...NOUNS.map((w) => w.length));
    expect(longestAdjective + longestNoun + 2).toBeLessThanOrEqual(NAME_MAX_LENGTH);
  });

  it("make every possible name valid and allowed", () => {
    const problems: string[] = [];
    for (const adjective of ADJECTIVES) {
      for (const noun of NOUNS) {
        for (const suffix of ["10", "99"]) {
          const name = `${adjective}${noun}${suffix}`;
          if (!checkNameFormat(name).ok || !isNameAllowed(name)) problems.push(name);
        }
      }
    }
    expect(problems).toEqual([]);
  });
});

describe("generateName", () => {
  it("builds Adjective + Noun + two digits, deterministically for a given random source", () => {
    expect(generateName(() => 0)).toBe(`${ADJECTIVES[0]}${NOUNS[0]}10`);
    expect(generateName(() => 0.999999)).toBe(`${ADJECTIVES[ADJECTIVES.length - 1]}${NOUNS[NOUNS.length - 1]}99`);
  });
});

describe("generateCandidates", () => {
  it("returns the requested number of distinct, valid names", () => {
    const names = generateCandidates(3);
    expect(names).toHaveLength(3);
    expect(new Set(names.map((n) => n.toLowerCase())).size).toBe(3);
    for (const name of names) expect(checkNameFormat(name).ok).toBe(true);
  });

  it("skips names the caller says are unavailable", () => {
    const taken = new Set<string>();
    let calls = 0;
    const names = generateCandidates(3, Math.random, (name) => {
      calls++;
      if (calls <= 5) {
        taken.add(name);
        return false;
      }
      return true;
    });
    expect(names).toHaveLength(3);
    for (const name of names) expect(taken.has(name)).toBe(false);
  });
});
