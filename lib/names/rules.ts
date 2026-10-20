// Format rules for player names. Pure and free of any word lists, so the same
// checks can run in the browser (instant feedback) and on the server.
export const NAME_MIN_LENGTH = 3;
export const NAME_MAX_LENGTH = 20;

export type NameFormatReason = "TOO_SHORT" | "TOO_LONG" | "BAD_CHARACTERS" | "NEEDS_LETTER";

export type NameFormatResult = { ok: true; name: string } | { ok: false; reason: NameFormatReason };

export const FORMAT_MESSAGES: Record<NameFormatReason, string> = {
  TOO_SHORT: `Use at least ${NAME_MIN_LENGTH} characters.`,
  TOO_LONG: `Use ${NAME_MAX_LENGTH} characters or fewer.`,
  BAD_CHARACTERS: "Use letters and numbers only, with no spaces or symbols.",
  NEEDS_LETTER: "Include at least one letter, not just numbers.",
};

// Plain ASCII letters and numbers only: no spaces, symbols, accents or
// lookalike characters, which also keeps names safe to show anywhere.
export function checkNameFormat(raw: string): NameFormatResult {
  const name = raw.trim();
  if (/[^A-Za-z0-9]/.test(name)) return { ok: false, reason: "BAD_CHARACTERS" };
  if (name.length < NAME_MIN_LENGTH) return { ok: false, reason: "TOO_SHORT" };
  if (name.length > NAME_MAX_LENGTH) return { ok: false, reason: "TOO_LONG" };
  if (!/[A-Za-z]/.test(name)) return { ok: false, reason: "NEEDS_LETTER" };
  return { ok: true, name };
}

// Names are unique ignoring case, so "Rahul" and "RAHUL" are the same name.
export function nameKey(name: string): string {
  return name.toLowerCase();
}
