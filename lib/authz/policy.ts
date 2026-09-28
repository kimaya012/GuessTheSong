import { daysBetween } from "@/lib/date";

// Single source of truth for "who may do what". Role (authority) and plan
// (what was paid for) are separate: premium is a time-bounded entitlement,
// not a role. Every gate in the app goes through `can()`.
export type Role = "user" | "admin";
export type Plan = "free" | "premium";

export type Capability =
  | "puzzle:today"
  | "archive:recent"
  | "archive:full"
  | "stats:cloud"
  | "stats:deep"
  | "badge:premium"
  | "ads:none"
  | "admin:access";

export interface Viewer {
  userId: string | null;
  deviceId: string;
  email: string | null;
  name: string | null;
  role: Role | null;
  plan: Plan;
}

export type Tier = "guest" | "free" | "premium" | "admin";

export const ARCHIVE_FREE_DAYS = 7;

export function tierOf(viewer: Viewer): Tier {
  if (!viewer.userId) return "guest";
  if (viewer.role === "admin") return "admin";
  return viewer.plan === "premium" ? "premium" : "free";
}

const GRANTS: Record<Tier, ReadonlySet<Capability>> = {
  guest: new Set(["puzzle:today", "archive:recent"]),
  free: new Set(["puzzle:today", "archive:recent", "stats:cloud"]),
  premium: new Set([
    "puzzle:today",
    "archive:recent",
    "archive:full",
    "stats:cloud",
    "stats:deep",
    "badge:premium",
    "ads:none",
  ]),
  admin: new Set([
    "puzzle:today",
    "archive:recent",
    "archive:full",
    "stats:cloud",
    "stats:deep",
    "ads:none",
    "admin:access",
  ]),
};

export function can(viewer: Viewer, capability: Capability): boolean {
  return GRANTS[tierOf(viewer)].has(capability);
}

export type PuzzleAccess = "ok" | "future" | "premium_required";

export function puzzleAccess(viewer: Viewer, date: string, today: string): PuzzleAccess {
  const age = daysBetween(date, today);
  if (age < 0) return "future";
  if (age <= ARCHIVE_FREE_DAYS) return "ok";
  return can(viewer, "archive:full") ? "ok" : "premium_required";
}
