import { and, eq, gt, inArray, isNotNull, isNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { entitlements, linkedEmails, user } from "@/db/schema";
import type { Plan } from "@/lib/authz/policy";
import { entitlementStatusFor, type BmcMembershipEvent } from "@/lib/billing/bmc";
import { writeAudit } from "@/lib/services/audit";

// Premium is derived, never stored as a flag: a user is premium while any
// of their entitlements is active/cancelled and its period hasn't ended.
export async function getPlan(userId: string | null): Promise<Plan> {
  if (!userId) return "free";
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

export async function getActiveEntitlement(userId: string) {
  const rows = await db
    .select()
    .from(entitlements)
    .where(
      and(
        eq(entitlements.userId, userId),
        inArray(entitlements.status, ["active", "cancelled"]),
        gt(entitlements.currentPeriodEnd, sql`now()`),
      ),
    )
    .orderBy(sql`${entitlements.currentPeriodEnd} desc`)
    .limit(1);
  return rows[0] ?? null;
}

// Only *verified* addresses may claim a payment: the account's own email
// (if verified) or a linked email that passed the ownership check.
async function userIdForVerifiedEmail(email: string): Promise<string | null> {
  const primary = await db
    .select({ id: user.id })
    .from(user)
    .where(and(eq(user.email, email), eq(user.emailVerified, true)))
    .limit(1);
  if (primary[0]) return primary[0].id;
  const linked = await db
    .select({ userId: linkedEmails.userId })
    .from(linkedEmails)
    .where(and(eq(linkedEmails.email, email), isNotNull(linkedEmails.verifiedAt)))
    .limit(1);
  return linked[0]?.userId ?? null;
}

export async function verifiedEmailsFor(userId: string): Promise<string[]> {
  const [primary] = await db
    .select({ email: user.email, verified: user.emailVerified })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);
  const linked = await db
    .select({ email: linkedEmails.email })
    .from(linkedEmails)
    .where(and(eq(linkedEmails.userId, userId), isNotNull(linkedEmails.verifiedAt)));
  return [...(primary?.verified ? [primary.email] : []), ...linked.map((l) => l.email)];
}

export async function applyBmcEvent(event: BmcMembershipEvent, now: Date = new Date()): Promise<void> {
  const status = entitlementStatusFor(event, now);
  const matchedUserId = await userIdForVerifiedEmail(event.email);
  await db
    .insert(entitlements)
    .values({
      userId: matchedUserId,
      email: event.email,
      source: "bmc",
      externalRef: event.membershipId,
      status,
      currentPeriodEnd: event.periodEnd,
    })
    .onConflictDoUpdate({
      target: [entitlements.source, entitlements.externalRef],
      set: {
        email: event.email,
        status,
        currentPeriodEnd: event.periodEnd,
        // Keep an existing owner if the email no longer resolves.
        userId: sql`coalesce(${matchedUserId}, ${entitlements.userId})`,
        updatedAt: sql`now()`,
      },
    });
}

export async function attachPendingEntitlements(userId: string): Promise<number> {
  const emails = await verifiedEmailsFor(userId);
  if (emails.length === 0) return 0;
  const attached = await db
    .update(entitlements)
    .set({ userId, updatedAt: sql`now()` })
    .where(and(isNull(entitlements.userId), inArray(entitlements.email, emails)))
    .returning({ id: entitlements.id });
  return attached.length;
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
