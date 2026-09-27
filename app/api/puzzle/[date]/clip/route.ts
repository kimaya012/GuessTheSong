import { getViewer } from "@/lib/viewer";
import { getClip } from "@/lib/services/puzzles";
import { resolvePuzzleDate } from "@/lib/services/access";
import { jsonError } from "@/lib/http";

// Serves only the audio this viewer has unlocked. The response depends on
// who is asking, so it must never be cached publicly.
export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const viewer = await getViewer();
  const gate = resolvePuzzleDate(viewer, (await params).date);
  if (!gate.ok) return gate.response;

  const clip = await getClip(viewer, gate.date);
  if (!clip || clip.bytes.length === 0) return jsonError("CLIP_UNAVAILABLE", 503);

  return new Response(new Uint8Array(clip.bytes), {
    headers: {
      "Content-Type": clip.mime,
      "Content-Length": String(clip.bytes.length),
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
