import { getViewer } from "@/lib/viewer";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp, jsonError, jsonOk } from "@/lib/http";
import { suggestNames } from "@/lib/services/names";

// Three name ideas that are valid and currently free. Nothing is reserved.
export async function GET(req: Request) {
  const viewer = await getViewer();
  const owner = await rateLimit(`suggest:${viewer.userId ?? viewer.deviceId}`, 30, 60);
  const ip = await rateLimit(`suggest-ip:${clientIp(req)}`, 120, 60);
  if (!owner.ok || !ip.ok) return jsonError("RATE_LIMITED", 429, { retryAfterSec: Math.max(owner.retryAfterSec, ip.retryAfterSec) });
  return jsonOk({ names: await suggestNames(3) });
}
