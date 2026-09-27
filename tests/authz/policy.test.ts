import { describe, expect, it } from "vitest";
import { can, puzzleAccess, tierOf, type Capability, type Viewer } from "@/lib/authz/policy";

const DEVICE = "7b2a1f3e-3c1d-4f5e-9a8b-1c2d3e4f5a6b";
const guest: Viewer = { userId: null, deviceId: DEVICE, email: null, name: null, role: null, plan: "free" };
const free: Viewer = { ...guest, userId: "u1", email: "a@b.c", role: "user" };
const premium: Viewer = { ...free, plan: "premium" };
const admin: Viewer = { ...free, role: "admin" };

const matrix: Record<Capability, [boolean, boolean, boolean, boolean]> = {
  //                  guest  free   premium admin
  "puzzle:today": [true, true, true, true],
  "archive:recent": [true, true, true, true],
  "archive:full": [false, false, true, true],
  "stats:cloud": [false, true, true, true],
  "stats:deep": [false, false, true, true],
  "badge:premium": [false, false, true, false],
  "ads:none": [false, false, true, true],
  "admin:access": [false, false, false, true],
};

describe("capability matrix", () => {
  for (const [capability, expected] of Object.entries(matrix) as [Capability, boolean[]][]) {
    it(capability, () => {
      expect([guest, free, premium, admin].map((v) => can(v, capability))).toEqual(expected);
    });
  }

  it("classifies tiers", () => {
    expect([guest, free, premium, admin].map(tierOf)).toEqual(["guest", "free", "premium", "admin"]);
  });

  it("never lets a signed-out viewer claim a role or plan", () => {
    const forged: Viewer = { ...guest, role: "admin", plan: "premium" };
    expect(can(forged, "admin:access")).toBe(false);
    expect(can(forged, "archive:full")).toBe(false);
  });
});

describe("puzzleAccess", () => {
  const today = "2026-09-28";
  it("allows today and the last 7 days to everyone", () => {
    expect(puzzleAccess(guest, today, today)).toBe("ok");
    expect(puzzleAccess(guest, "2026-09-21", today)).toBe("ok");
  });
  it("gates older puzzles behind Premium", () => {
    expect(puzzleAccess(free, "2026-09-20", today)).toBe("premium_required");
    expect(puzzleAccess(premium, "2026-01-01", today)).toBe("ok");
  });
  it("never serves future puzzles, even to admins", () => {
    expect(puzzleAccess(admin, "2026-09-29", today)).toBe("future");
  });
});
