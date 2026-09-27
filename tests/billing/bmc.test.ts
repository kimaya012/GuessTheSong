import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { entitlementStatusFor, parseBmcEvent, verifyBmcSignature } from "@/lib/billing/bmc";

const SECRET = "whsec_test_secret";
const sign = (body: string) => createHmac("sha256", SECRET).update(body).digest("hex");
const NOW = new Date("2026-09-28T00:00:00Z");

const started = {
  type: "membership.started",
  live_mode: false,
  attempt: 1,
  created: 1790000000,
  event_id: 42,
  data: {
    id: 3001,
    status: "active",
    canceled: "false",
    supporter_email: "Fan@Example.com ",
    current_period_end: 1792600000,
  },
};

describe("signature verification", () => {
  const body = JSON.stringify(started);
  it("accepts a valid HMAC-SHA256 hex signature", () => {
    expect(verifyBmcSignature(body, sign(body), SECRET)).toBe(true);
  });
  it("rejects tampering, a missing header, or an empty secret", () => {
    const sig = sign(body);
    const flipped = sig.slice(0, -1) + (sig.endsWith("0") ? "1" : "0");
    expect(verifyBmcSignature(body, flipped, SECRET)).toBe(false);
    expect(verifyBmcSignature(body + " ", sig, SECRET)).toBe(false);
    expect(verifyBmcSignature(body, null, SECRET)).toBe(false);
    expect(verifyBmcSignature(body, sig, "")).toBe(false);
  });
});

describe("event parsing", () => {
  it("normalises a membership.started event", () => {
    const e = parseBmcEvent(started, JSON.stringify(started), NOW);
    expect(e).toEqual({
      eventId: "bmc:42",
      type: "membership.started",
      email: "fan@example.com",
      membershipId: "3001",
      periodEnd: new Date(1792600000 * 1000),
      cancelled: false,
    });
  });

  it("falls back to 31 days when the period end is missing", () => {
    const payload = { ...started, data: { ...started.data, current_period_end: undefined } };
    const e = parseBmcEvent(payload, JSON.stringify(payload), NOW);
    expect("periodEnd" in e && e.periodEnd.toISOString()).toBe("2026-10-29T00:00:00.000Z");
  });

  it("derives an event id from the body hash when BMC omits one", () => {
    const payload = { ...started, event_id: undefined };
    const e = parseBmcEvent(payload, JSON.stringify(payload), NOW);
    expect("eventId" in e && e.eventId).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("ignores unrelated or malformed events", () => {
    expect(parseBmcEvent({ type: "donation.created", data: {} }, "{}", NOW)).toEqual({
      ignored: "donation.created",
    });
    expect(parseBmcEvent({ type: "membership.started", data: {} }, "{}", NOW)).toHaveProperty("ignored");
    expect(parseBmcEvent("nope", "nope", NOW)).toHaveProperty("ignored");
  });
});

describe("entitlement status", () => {
  const base = {
    eventId: "bmc:1",
    type: "membership.cancelled" as const,
    email: "a@b.c",
    membershipId: "1",
    cancelled: true,
  };
  it("keeps access until a cancelled period ends", () => {
    expect(entitlementStatusFor({ ...base, periodEnd: new Date("2026-10-10") }, NOW)).toBe("cancelled");
    expect(entitlementStatusFor({ ...base, periodEnd: new Date("2026-09-01") }, NOW)).toBe("expired");
  });
  it("is active for a live membership", () => {
    expect(
      entitlementStatusFor({ ...base, type: "membership.started", cancelled: false, periodEnd: new Date("2026-10-10") }, NOW),
    ).toBe("active");
  });
});
