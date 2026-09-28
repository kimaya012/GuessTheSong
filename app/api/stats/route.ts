import { getViewer } from "@/lib/viewer";
import { can } from "@/lib/authz/policy";
import { getAttemptSummaries } from "@/lib/services/stats";
import { deriveDeepStats, deriveStats } from "@/lib/game/stats";
import { jsonOk } from "@/lib/http";

export async function GET() {
  const viewer = await getViewer();
  const attempts = await getAttemptSummaries(viewer);
  return jsonOk({
    stats: deriveStats(attempts),
    deep: can(viewer, "stats:deep") ? deriveDeepStats(attempts) : null,
  });
}
