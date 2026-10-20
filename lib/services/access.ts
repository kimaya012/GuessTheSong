import { isValidDateString, resolveDateParam, todayInTz } from "@/lib/date";
import { puzzleAccess } from "@/lib/authz/policy";
import { jsonError } from "@/lib/http";

// Shared date gate for puzzle routes: validates the param and resolves
// "today" in the puzzle timezone. Every past puzzle is open to everyone;
// only future dates are refused, so tomorrow's answer can't be probed.
export function resolvePuzzleDate(rawDate: string): { ok: true; date: string } | { ok: false; response: Response } {
  const today = todayInTz();
  const date = resolveDateParam(rawDate, today);
  if (!isValidDateString(date)) return { ok: false, response: jsonError("INVALID_DATE", 400) };
  if (puzzleAccess(date, today) === "future") return { ok: false, response: jsonError("NOT_FOUND", 404) };
  return { ok: true, date };
}
