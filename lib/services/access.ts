import { isValidDateString, resolveDateParam, todayInTz } from "@/lib/date";
import { puzzleAccess, type Viewer } from "@/lib/authz/policy";
import { jsonError } from "@/lib/http";

// Shared date gate for puzzle routes: validates the param, resolves "today"
// in the puzzle timezone, and applies the tier's archive window.
export function resolvePuzzleDate(
  viewer: Viewer,
  rawDate: string,
): { ok: true; date: string } | { ok: false; response: Response } {
  const date = resolveDateParam(rawDate, todayInTz());
  if (!isValidDateString(date)) return { ok: false, response: jsonError("INVALID_DATE", 400) };
  const access = puzzleAccess(viewer, date, todayInTz());
  if (access === "future") return { ok: false, response: jsonError("NOT_FOUND", 404) };
  if (access === "premium_required") return { ok: false, response: jsonError("PREMIUM_REQUIRED", 403) };
  return { ok: true, date };
}
