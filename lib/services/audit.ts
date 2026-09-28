import { db } from "@/lib/db";
import { auditLog } from "@/db/schema";

export async function writeAudit(
  actorUserId: string | null,
  action: string,
  target: string | null,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  await db.insert(auditLog).values({ actorUserId, action, target, metadata });
}
