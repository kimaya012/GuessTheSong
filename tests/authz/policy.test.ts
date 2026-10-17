import { describe, expect, it } from "vitest";
import { can, puzzleAccess, tierOf, type Capability, type Viewer } from "@/lib/authz/policy";

const DEVICE = "7b2a1f3e-3c1d-4f5e-9a8b-1c2d3e4f5a6b";
const guest: Viewer = { userId: null, deviceId: DEVICE, email: null, name: null, role: null, plan: "free" };
const free: Viewer = { ...guest, userId: "u1", email: "a@b.c", role: "user" };
const premium: Viewer = { ...free, plan: "premium" };
const admin: Viewer = { ...free, role: "admin" };

// The archive and today's puzzle are open to everyone, so they are not
// capabilities. Only real gates are listed here.
const matrix: Record<Capability, [boolean, boolean, boolean, boolean]> = {
  //                  guest  free   premium admin
  "stats:deep": [false, true, true, true],
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
    expect(can(forged, "ads:none")).toBe(false);
    expect(can(forged, "stats:deep")).toBe(false);
  });
});

describe("puzzleAccess", () => {
  const today = "2026-09-28";
  it("opens today and every past puzzle to everyone", () => {
    expect(puzzleAccess(today, today)).toBe("ok");
    expect(puzzleAccess("2026-09-21", today)).toBe("ok");
    expect(puzzleAccess("2026-01-01", today)).toBe("ok");
  });
  it("never serves future puzzles", () => {
    expect(puzzleAccess("2026-09-29", today)).toBe("future");
    expect(puzzleAccess("2027-01-01", today)).toBe("future");
  });
});
