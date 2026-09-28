import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

// Buy Me a Coffee membership webhooks. Field names follow BMC's documented
// payload (`data.supporter_email`, `data.current_period_end` in unix
// seconds); the schema is deliberately tolerant so a renamed optional field
// degrades to a safe default instead of dropping a paid membership.
// Confirm against a "send test webhook" from the BMC dashboard at setup.

export function verifyBmcSignature(rawBody: string, signature: string | null, secret: string): boolean {
  if (!signature || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let provided: Buffer;
  try {
    provided = Buffer.from(signature.trim(), "hex");
  } catch {
    return false;
  }
  return provided.length === expected.length && timingSafeEqual(provided, expected);
}

const HANDLED = ["membership.started", "membership.updated", "membership.cancelled"] as const;
type HandledType = (typeof HANDLED)[number];

export interface BmcMembershipEvent {
  eventId: string;
  type: HandledType;
  email: string;
  membershipId: string;
  periodEnd: Date;
  cancelled: boolean;
}

const truthy = z.union([z.boolean(), z.string(), z.null(), z.undefined()]).transform((v) => v === true || v === "true");

const timestamp = z
  .union([z.number(), z.string(), z.null(), z.undefined()])
  .transform((v): Date | null => {
    if (v === null || v === undefined || v === "") return null;
    if (typeof v === "number" || /^\d+$/.test(v)) {
      const n = Number(v);
      return new Date(n < 1e12 ? n * 1000 : n);
    }
    const parsed = new Date(v);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  });

const envelope = z.object({
  type: z.string(),
  event_id: z.union([z.number(), z.string()]).optional(),
  data: z
    .object({
      id: z.union([z.number(), z.string()]).optional(),
      psp_id: z.string().optional(),
      supporter_email: z.string().optional(),
      payer_email: z.string().optional(),
      status: z.string().optional(),
      canceled: truthy.optional(),
      cancel_at_period_end: truthy.optional(),
      current_period_end: timestamp.optional(),
    })
    .passthrough(),
});

const THIRTY_ONE_DAYS_MS = 31 * 86_400_000;

export function parseBmcEvent(payload: unknown, rawBody: string, now: Date = new Date()): BmcMembershipEvent | { ignored: string } {
  const parsed = envelope.safeParse(payload);
  if (!parsed.success) return { ignored: "malformed payload" };
  const { type, event_id, data } = parsed.data;
  if (!(HANDLED as readonly string[]).includes(type)) return { ignored: type };

  const email = (data.supporter_email ?? data.payer_email ?? "").trim().toLowerCase();
  const membershipId = data.id !== undefined ? String(data.id) : data.psp_id;
  if (!z.string().email().safeParse(email).success || !membershipId) {
    return { ignored: `${type} without supporter email or membership id` };
  }

  return {
    eventId:
      event_id !== undefined
        ? `bmc:${event_id}`
        : `sha256:${createHash("sha256").update(rawBody, "utf8").digest("hex")}`,
    type: type as HandledType,
    email,
    membershipId,
    periodEnd: data.current_period_end ?? new Date(now.getTime() + THIRTY_ONE_DAYS_MS),
    cancelled: type === "membership.cancelled" || data.canceled === true || data.status === "canceled",
  };
}

export function entitlementStatusFor(
  event: BmcMembershipEvent,
  now: Date = new Date(),
): "active" | "cancelled" | "expired" {
  if (event.periodEnd.getTime() <= now.getTime()) return "expired";
  return event.cancelled ? "cancelled" : "active";
}
