import { and, eq, gt, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements, user } from "@/db/schema";
import type { Plan } from "@/lib/authz/policy";
import { env } from "@/lib/env";
import { writeAudit } from "@/lib/services/audit";

// Premium is parked: with PREMIUM_ENABLED unset every player is on the free
// plan, whatever the entitlements table says. The plumbing below stays so it
// can come back cheaply (e.g. an on-site checkout that writes entitlements).
//
// When it is on, premium is derived, never stored as a flag: a user is premium
// while any of their entitlements is active/cancelled and its period hasn't
// ended.
export async function getPlan(userId: string | null): Promise<Plan> {
  if (!userId || !env().PREMIUM_ENABLED) return "free";
  const rows = await db
    .select({ id: entitlements.id })
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        inArray(entitlements.status, ["active", "cancelled"]),
        gt(entitlements.currentPeriodEnd, sql`now()`),
      ),
    )
    .limit(1);
  return rows.length ? "premium" : "free";
}

export async function grantPremium(actorId: string, userId: string, days: number): Promise<void> {
  const [target] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (!target) throw new Error("User not found");
  const ref = `admin:${userId}`;
  const [existing] = await db
    .select({ end: entitlements.currentPeriodEnd, status: entitlements.status })
    .from(entitlements)
    .where(and(eq(entitlements.source, "admin"), eq(entitlements.externalRef, ref)))
    .limit(1);
  const base = existing && existing.status !== "expired" && existing.end > new Date() ? existing.end : new Date();
  const end = new Date(base.getTime() + days * 86_400_000);

  await db
    .insert(entitlements)
    .values({ userId, email: target.email, source: "admin", externalRef: ref, status: "active", currentPeriodEnd: end })
    .onConflictDoUpdate({
      target: [entitlements.source, entitlements.externalRef],
      set: { userId, status: "active", currentPeriodEnd: end, updatedAt: sql`now()` },
    });
  await writeAudit(actorId, "premium.grant", userId, { days, until: end.toISOString() });
}

export async function revokePremium(actorId: string, userId: string): Promise<void> {
  const revoked = await db
    .update(entitlements)
    .set({ status: "expired", currentPeriodEnd: sql`now()`, updatedAt: sql`now()` })
    .where(and(eq(entitlements.userId, userId), inArray(entitlements.status, ["active", "cancelled"])))
    .returning({ id: entitlements.id, source: entitlements.source });
  await writeAudit(actorId, "premium.revoke", userId, { entitlements: revoked });
}
