import { z } from "zod";
import { getViewer } from "@/lib/viewer";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, isSameOrigin, jsonError, jsonOk } from "@/lib/http";
import { FORMAT_MESSAGES } from "@/lib/names/rules";
import { changeDecision, claimName, getPlayerName } from "@/lib/services/names";

const bodySchema = z.object({ name: z.string().max(64) });

// What the client needs to draw the name picker.
async function state() {
  const viewer = await getViewer();
  const current = await getPlayerName(viewer);
  const decision = changeDecision(viewer, current);
  return {
    name: current?.name ?? null,
    signedIn: !!viewer.userId,
    canChange: decision.ok,
    reason: decision.ok ? null : decision.reason,
    retryAt: !decision.ok && decision.reason === "COOLDOWN" ? new Date(decision.retryAt).toISOString() : null,
  };
}

export async function GET() {
  return jsonOk(await state());
}

export async function POST(req: Request) {
  if (!isSameOrigin(req)) return jsonError("FORBIDDEN_ORIGIN", 403);

  const viewer = await getViewer();
  const owner = await rateLimit(`name:${viewer.userId ?? viewer.deviceId}`, 12, 3600);
  // Clearing cookies gives a fresh identity, so also limit by network address.
  const ip = await rateLimit(`name-ip:${clientIp(req)}`, 40, 3600);
  if (!owner.ok || !ip.ok) return jsonError("RATE_LIMITED", 429, { retryAfterSec: Math.max(owner.retryAfterSec, ip.retryAfterSec) });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("INVALID_BODY", 400);

  const result = await claimName(viewer, parsed.data.name);
  if (result.ok) return jsonOk(await state());

  switch (result.code) {
    case "INVALID_NAME":
      return jsonError("INVALID_NAME", 400, {
        reason: result.reason,
        message: result.reason === "NOT_ALLOWED" ? "That name isn't available. Try another." : FORMAT_MESSAGES[result.reason],
      });
    case "NAME_TAKEN":
      return jsonError("NAME_TAKEN", 409, { message: "Someone already has that name. Try another." });
    case "SIGN_IN_REQUIRED":
      return jsonError("SIGN_IN_REQUIRED", 403, { message: "Sign in to change your name." });
    case "COOLDOWN":
      return jsonError("COOLDOWN", 429, { retryAt: result.retryAt.toISOString() });
  }
}
