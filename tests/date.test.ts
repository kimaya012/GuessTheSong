import { describe, expect, it } from "vitest";
import { todayInTz, addDays, daysBetween, isValidDateString, msUntilNextPuzzle } from "@/lib/date";

describe("puzzle-day dates", () => {
  it("rolls over at IST midnight, not UTC", () => {
    // 2026-09-27T19:00Z = 2026-09-28 00:30 IST
    expect(todayInTz("Asia/Kolkata", new Date("2026-09-27T19:00:00Z"))).toBe("2026-09-28");
    expect(todayInTz("UTC", new Date("2026-09-27T19:00:00Z"))).toBe("2026-09-27");
  });

  it("adds and diffs days across month ends", () => {
    expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(daysBetween("2026-09-21", "2026-09-28")).toBe(7);
  });

  it("validates strict YYYY-MM-DD", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-9-1")).toBe(false);
    expect(isValidDateString("today")).toBe(false);
    expect(isValidDateString("2026-09-01")).toBe(true);
  });

  it("counts down to the next IST midnight", () => {
    // 18:00Z = 23:30 IST → 30 minutes left
    expect(msUntilNextPuzzle("Asia/Kolkata", new Date("2026-09-27T18:00:00Z"))).toBe(30 * 60 * 1000);
    expect(msUntilNextPuzzle("UTC", new Date("2026-09-27T23:59:00Z"))).toBe(60 * 1000);
  });
});
