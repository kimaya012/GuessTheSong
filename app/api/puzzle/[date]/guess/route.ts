import { z } from "zod";
import { getViewer } from "@/lib/viewer";
import { GameError, submitGuess } from "@/lib/services/puzzles";
import { resolvePuzzleDate } from "@/lib/services/access";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin, jsonError, jsonOk } from "@/lib/http";

const bodySchema = z.object({
  songId: z.uuid().nullable(),
  giveUp: z.boolean().optional().default(false),
});

const STATUS: Record<GameError["code"], number> = { NO_PUZZLE: 404, ALREADY_COMPLETED: 409, UNKNOWN_SONG: 422 };

export async function POST(req: Request, { params }: { params: Promise<{ date: string }> }) {
  if (!isSameOrigin(req)) return jsonError("FORBIDDEN_ORIGIN", 403);

  const viewer = await getViewer();
  const limit = await rateLimit(`guess:${viewer.userId ?? viewer.deviceId}`, 30, 60);
  if (!limit.ok) return jsonError("RATE_LIMITED", 429, { retryAfterSec: limit.retryAfterSec });

  const gate = resolvePuzzleDate(viewer, (await params).date);
  if (!gate.ok) return gate.response;

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return jsonError("INVALID_BODY", 400);

  try {
    return jsonOk(await submitGuess(viewer, gate.date, parsed.data));
  } catch (err) {
    if (err instanceof GameError) return jsonError(err.code, STATUS[err.code]);
    throw err;
  }
}
