import { getViewer } from "@/lib/viewer";
import { getPuzzleShell } from "@/lib/services/puzzles";
import { resolvePuzzleDate } from "@/lib/services/access";
import { jsonError, jsonOk } from "@/lib/http";

export async function GET(_req: Request, { params }: { params: Promise<{ date: string }> }) {
  const viewer = await getViewer();
  const gate = resolvePuzzleDate(viewer, (await params).date);
  if (!gate.ok) return gate.response;

  const shell = await getPuzzleShell(viewer, gate.date);
  if (!shell) return jsonError("NO_PUZZLE", 404);
  return jsonOk(shell);
}
