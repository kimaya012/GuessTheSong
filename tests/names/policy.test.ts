import { describe, expect, it } from "vitest";
import { NAME_CHANGE_COOLDOWN_DAYS, canChangeName, planNameMerge } from "@/lib/names/policy";

const DAY = 86_400_000;
const NOW = Date.UTC(2026, 9, 18, 12, 0, 0);

describe("canChangeName", () => {
  it("lets anyone claim a first name", () => {
    expect(canChangeName({ signedIn: false, changedAt: null, now: NOW })).toEqual({ ok: true });
    expect(canChangeName({ signedIn: true, changedAt: null, now: NOW })).toEqual({ ok: true });
  });

  it("asks a guest who already has a name to sign in before changing it", () => {
    expect(canChangeName({ signedIn: false, changedAt: NOW - 30 * DAY, now: NOW })).toEqual({
      ok: false,
      reason: "SIGN_IN_REQUIRED",
    });
  });

  it("makes a signed-in player wait a week between changes", () => {
    expect(NAME_CHANGE_COOLDOWN_DAYS).toBe(7);
    const changedAt = NOW - 3 * DAY;
    expect(canChangeName({ signedIn: true, changedAt, now: NOW })).toEqual({
      ok: false,
      reason: "COOLDOWN",
      retryAt: changedAt + 7 * DAY,
    });
  });

  it("allows a change once the week is up", () => {
    expect(canChangeName({ signedIn: true, changedAt: NOW - 7 * DAY, now: NOW })).toEqual({ ok: true });
    expect(canChangeName({ signedIn: true, changedAt: NOW - 30 * DAY, now: NOW })).toEqual({ ok: true });
  });
});

describe("planNameMerge (device name meets account on sign-in)", () => {
  it("moves the device name to an account that has none", () => {
    expect(planNameMerge({ userHasName: false, deviceHasName: true })).toBe("transfer");
  });
  it("keeps the account name and frees the device name when both exist", () => {
    expect(planNameMerge({ userHasName: true, deviceHasName: true })).toBe("release_device");
  });
  it("does nothing when there is no device name", () => {
    expect(planNameMerge({ userHasName: true, deviceHasName: false })).toBe("none");
    expect(planNameMerge({ userHasName: false, deviceHasName: false })).toBe("none");
  });
});
