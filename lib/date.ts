export function todayUtcString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isFutureDate(dateStr: string): boolean {
  return dateStr > todayUtcString();
}

export function isValidDateString(dateStr: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !Number.isNaN(Date.parse(dateStr));
}

// Resolves the special "today" alias (used by client routes so they never
// need to know the server's current date up front) to a real date string.
export function resolveDateParam(dateParam: string): string {
  return dateParam === "today" ? todayUtcString() : dateParam;
}
