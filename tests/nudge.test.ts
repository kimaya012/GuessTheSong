import { describe, expect, it } from "vitest";
import { NUDGE_SNOOZE_DAYS, isSnoozed, parseSnooze, snoozedUntil } from "@/lib/nudge";

const NOW = Date.UTC(2026, 9, 17, 12, 0, 0);
const DAY = 86_400_000;

describe("sign-in nudge snooze", () => {
  it("snoozes for a week by default", () => {
    expect(NUDGE_SNOOZE_DAYS).toBe(7);
    expect(snoozedUntil(NOW)).toBe(NOW + 7 * DAY);
    expect(snoozedUntil(NOW, 2)).toBe(NOW + 2 * DAY);
  });

  it("is snoozed only until the deadline passes", () => {
    const until = snoozedUntil(NOW);
    expect(isSnoozed(until, NOW)).toBe(true);
    expect(isSnoozed(until, NOW + 7 * DAY - 1)).toBe(true);
    expect(isSnoozed(until, NOW + 7 * DAY)).toBe(false);
  });

  it("treats a missing or invalid deadline as not snoozed", () => {
    expect(isSnoozed(null, NOW)).toBe(false);
    expect(isSnoozed(undefined, NOW)).toBe(false);
    expect(isSnoozed(Number.NaN, NOW)).toBe(false);
  });

  it("parses stored values defensively", () => {
    expect(parseSnooze(String(NOW + DAY))).toBe(NOW + DAY);
    expect(parseSnooze(null)).toBeNull();
    expect(parseSnooze("")).toBeNull();
    expect(parseSnooze("not a number")).toBeNull();
    expect(parseSnooze("-5")).toBeNull();
  });
});
