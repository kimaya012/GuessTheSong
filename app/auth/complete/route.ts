import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { user } from "@/db/schema";
import { env } from "@/lib/env";
import { getViewer } from "@/lib/viewer";
import { mergeDeviceIntoUser } from "@/lib/services/puzzles";
import { attachPendingEntitlements } from "@/lib/services/entitlements";
import { writeAudit } from "@/lib/services/audit";
import { safeNextPath } from "@/lib/safe-redirect";
import { getAuth } from "@/lib/auth";

// Landing point after every sign-in (magic link or Google): moves this
// device's guest games onto the account, claims any Premium paid for with
// the account's verified email, and promotes configured admin emails.
export async function GET(req: NextRequest) {
  const next = safeNextPath(req.nextUrl.searchParams.get("next"));
  const session = await getAuth().api.getSession({ headers: req.headers });
  if (!session) return NextResponse.redirect(new URL(`/sign-in?next=${encodeURIComponent(next)}`, req.url));

  const viewer = await getViewer();
  const moved = await mergeDeviceIntoUser(viewer.deviceId, session.user.id);
  await attachPendingEntitlements(session.user.id);

  const email = session.user.email.toLowerCase();
  if (session.user.emailVerified && env().ADMIN_EMAILS.includes(email) && session.user.role !== "admin") {
    await db.update(user).set({ role: "admin" }).where(eq(user.id, session.user.id));
    await writeAudit(session.user.id, "role.bootstrap_admin", session.user.id, { email });
  }
  if (moved > 0) await writeAudit(session.user.id, "device.merged", session.user.id, { games: moved });

  return NextResponse.redirect(new URL(next, req.url));
}
