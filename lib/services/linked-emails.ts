import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNotNull, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { linkedEmails, user } from "@/db/schema";
import { env } from "@/lib/env";
import { actionEmailHtml, sendEmail } from "@/lib/email";
import { attachPendingEntitlements } from "@/lib/services/entitlements";
import { writeAudit } from "@/lib/services/audit";

const TOKEN_TTL_MS = 30 * 60 * 1000;
const hashToken = (token: string) => createHash("sha256").update(token).digest("hex");

export async function listLinkedEmails(userId: string) {
  return db
    .select({ id: linkedEmails.id, email: linkedEmails.email, verifiedAt: linkedEmails.verifiedAt })
    .from(linkedEmails)
    .where(eq(linkedEmails.userId, userId))
    .orderBy(linkedEmails.createdAt);
}

// Sends an ownership check to `email`. Silently does nothing when the
// address already belongs to another account, so the response never
// reveals which emails are registered.
export async function requestLinkedEmail(userId: string, rawEmail: string): Promise<void> {
  const email = rawEmail.trim().toLowerCase();
  const [owner] = await db.select({ email: user.email }).from(user).where(eq(user.id, userId)).limit(1);
  if (!owner || owner.email === email) return;

  const takenByPrimary = await db.select({ id: user.id }).from(user).where(and(eq(user.email, email), ne(user.id, userId))).limit(1);
  const takenByLink = await db
    .select({ id: linkedEmails.id })
    .from(linkedEmails)
    .where(and(eq(linkedEmails.email, email), ne(linkedEmails.userId, userId), isNotNull(linkedEmails.verifiedAt)))
    .limit(1);
  if (takenByPrimary.length || takenByLink.length) return;

  const token = randomBytes(32).toString("base64url");
  await db
    .insert(linkedEmails)
    .values({ userId, email, tokenHash: hashToken(token), tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS) })
    .onConflictDoUpdate({
      target: [linkedEmails.userId, linkedEmails.email],
      set: { tokenHash: hashToken(token), tokenExpiresAt: new Date(Date.now() + TOKEN_TTL_MS) },
    });

  const url = `${env().BETTER_AUTH_URL}/account/verify-email?token=${token}`;
  await sendEmail({
    to: email,
    subject: "Confirm your email for GuessTheBollySong Premium",
    text: `Confirm this address to link it to your GuessTheBollySong account (valid 30 minutes):\n${url}`,
    html: actionEmailHtml(
      "Confirm this email",
      "Confirming lets memberships paid with this address unlock Premium on your account. The link expires in 30 minutes.",
      "Confirm email",
      url,
    ),
  });
}

// Single use: the token hash is cleared on success.
export async function verifyLinkedEmail(token: string): Promise<{ userId: string; email: string } | null> {
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return null;
  const [row] = await db
    .update(linkedEmails)
    .set({ verifiedAt: sql`now()`, tokenHash: null, tokenExpiresAt: null })
    .where(and(eq(linkedEmails.tokenHash, hashToken(token)), gt(linkedEmails.tokenExpiresAt, sql`now()`)))
    .returning({ userId: linkedEmails.userId, email: linkedEmails.email });
  if (!row) return null;
  await attachPendingEntitlements(row.userId);
  await writeAudit(row.userId, "linked_email.verified", row.userId, { email: row.email });
  return row;
}

export async function removeLinkedEmail(userId: string, id: string): Promise<void> {
  await db.delete(linkedEmails).where(and(eq(linkedEmails.id, id), eq(linkedEmails.userId, userId)));
}
