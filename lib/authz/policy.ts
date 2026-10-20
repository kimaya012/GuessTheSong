import { daysBetween } from "@/lib/date";

// Single source of truth for "who may do what". Role (authority) and plan
// (what was paid for) are separate. Today's puzzle and the whole archive are
// open to everyone; only the capabilities below are real gates.
//
// Premium is parked: while it is switched off (see getPlan) nobody has the
// "premium" plan. If it returns, give it only *additive* perks, never things
// free players already have.
export type Role = "user" | "admin";
export type Plan = "free" | "premium";

export type Capability = "stats:deep" | "badge:premium" | "ads:none" | "admin:access";

export interface Viewer {
  userId: string | null;
  deviceId: string;
  email: string | null;
  name: string | null;
  role: Role | null;
  plan: Plan;
}

export type Tier = "guest" | "free" | "premium" | "admin";

export function tierOf(viewer: Viewer): Tier {
  if (!viewer.userId) return "guest";
  if (viewer.role === "admin") return "admin";
  return viewer.plan === "premium" ? "premium" : "free";
}

const GRANTS: Record<Tier, ReadonlySet<Capability>> = {
  guest: new Set(),
  // Signing in unlocks the deeper stats breakdown, at no cost.
  free: new Set(["stats:deep"]),
  premium: new Set(["stats:deep", "badge:premium", "ads:none"]),
  admin: new Set(["stats:deep", "ads:none", "admin:access"]),
};

export function can(viewer: Viewer, capability: Capability): boolean {
  return GRANTS[tierOf(viewer)].has(capability);
}

export type PuzzleAccess = "ok" | "future";

export function puzzleAccess(date: string, today: string): PuzzleAccess {
  return daysBetween(date, today) < 0 ? "future" : "ok";
}
