// Puzzle days roll over at midnight in PUZZLE_TIMEZONE (the audience is
// mostly in India), not UTC. All date strings are plain "YYYY-MM-DD".
export const DEFAULT_PUZZLE_TIMEZONE = "Asia/Kolkata";

export function puzzleTimezone(): string {
  return process.env.PUZZLE_TIMEZONE || DEFAULT_PUZZLE_TIMEZONE;
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

function zonedParts(tz: string, now: Date): ZonedParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

export function todayInTz(tz: string = puzzleTimezone(), now: Date = new Date()): string {
  const p = zonedParts(tz, now);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

function toUtcMs(date: string): number {
  const [y, m, d] = date.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function addDays(date: string, n: number): string {
  return new Date(toUtcMs(date) + n * 86_400_000).toISOString().slice(0, 10);
}

export function daysBetween(from: string, to: string): number {
  return Math.round((toUtcMs(to) - toUtcMs(from)) / 86_400_000);
}

export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  // Round-trip catches impossible dates like 2026-02-30.
  return new Date(toUtcMs(value)).toISOString().slice(0, 10) === value;
}

export function msUntilNextPuzzle(tz: string = puzzleTimezone(), now: Date = new Date()): number {
  const p = zonedParts(tz, now);
  const elapsedMs = ((p.hour * 60 + p.minute) * 60 + p.second) * 1000 + now.getUTCMilliseconds();
  return 86_400_000 - elapsedMs;
}

// Resolves the "today" alias used by client routes, so the client never has
// to know the server's notion of the current puzzle day.
export function resolveDateParam(param: string, today: string = todayInTz()): string {
  return param === "today" ? today : param;
}
