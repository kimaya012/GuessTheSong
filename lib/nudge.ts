// Rules for the dismissible "sign in" prompt: once dismissed it stays away
// for a week. Kept pure so it can be tested; the browser storage is handled
// by the component.
export const NUDGE_SNOOZE_DAYS = 7;
const DAY_MS = 86_400_000;

export function snoozedUntil(now: number, days: number = NUDGE_SNOOZE_DAYS): number {
  return now + days * DAY_MS;
}

export function isSnoozed(until: number | null | undefined, now: number): boolean {
  return typeof until === "number" && Number.isFinite(until) && now < until;
}

// Stored values come from localStorage, which the user can edit.
export function parseSnooze(raw: string | null): number | null {
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : null;
}
