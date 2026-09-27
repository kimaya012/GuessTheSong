import { eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { webhookEvents } from "@/db/schema";
import { env } from "@/lib/env";
import { parseBmcEvent, verifyBmcSignature } from "@/lib/billing/bmc";
import { applyBmcEvent } from "@/lib/services/entitlements";
import { jsonError, jsonOk } from "@/lib/http";

const MAX_BODY_BYTES = 64 * 1024;

// Buy Me a Coffee membership webhook. Order matters: verify the signature
// over the raw body before parsing anything, then record the event id so a
// retried delivery is a no-op.
export async function POST(req: Request) {
  const secret = env().BMC_WEBHOOK_SECRET;
  if (!secret) return jsonError("WEBHOOK_NOT_CONFIGURED", 503);

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError("PAYLOAD_TOO_LARGE", 413);
  if (!verifyBmcSignature(raw, req.headers.get("x-signature-sha256"), secret)) {
    return jsonError("INVALID_SIGNATURE", 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(raw);
  } catch {
    return jsonError("INVALID_JSON", 400);
  }

  const event = parseBmcEvent(payload, raw);
  if ("ignored" in event) return jsonOk({ ok: true, ignored: event.ignored });

  const inserted = await db
    .insert(webhookEvents)
    .values({ id: event.eventId, provider: "bmc", type: event.type })
    .onConflictDoNothing()
    .returning({ id: webhookEvents.id });
  if (inserted.length === 0) {
    const [prior] = await db.select().from(webhookEvents).where(eq(webhookEvents.id, event.eventId)).limit(1);
    // Already handled successfully → acknowledge. A prior failure is retried.
    if (prior?.processedAt) return jsonOk({ ok: true, duplicate: true });
  }

  try {
    await applyBmcEvent(event);
    await db
      .update(webhookEvents)
      .set({ processedAt: sql`now()`, error: null })
      .where(eq(webhookEvents.id, event.eventId));
    return jsonOk({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await db.update(webhookEvents).set({ error: message.slice(0, 500) }).where(eq(webhookEvents.id, event.eventId));
    // 500 so BMC retries the delivery.
    return jsonError("PROCESSING_FAILED", 500);
  }
}
