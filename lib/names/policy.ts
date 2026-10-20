// Who may set or change a name, and what happens to a guest's name when they
// sign in. Pure, so it is easy to test and shared by the API and the UI.
export const NAME_CHANGE_COOLDOWN_DAYS = 7;
const DAY_MS = 86_400_000;

export type NameChangeDecision =
  | { ok: true }
  | { ok: false; reason: "SIGN_IN_REQUIRED" }
  | { ok: false; reason: "COOLDOWN"; retryAt: number };

// `changedAt` is when the current name was last set (null = no name yet).
// Anyone may claim a first name. A guest cannot change it afterwards (signing
// in is required), and a signed-in player waits a week between changes so
// names stay stable.
export function canChangeName(input: { signedIn: boolean; changedAt: number | null; now: number }): NameChangeDecision {
  if (input.changedAt === null) return { ok: true };
  if (!input.signedIn) return { ok: false, reason: "SIGN_IN_REQUIRED" };
  const retryAt = input.changedAt + NAME_CHANGE_COOLDOWN_DAYS * DAY_MS;
  return input.now >= retryAt ? { ok: true } : { ok: false, reason: "COOLDOWN", retryAt };
}

export type NameMergePlan = "transfer" | "release_device" | "none";

// A guest's name moves to their account when they sign in. If the account
// already has a name, the account keeps it and the device name is freed.
export function planNameMerge(input: { userHasName: boolean; deviceHasName: boolean }): NameMergePlan {
  if (!input.deviceHasName) return "none";
  return input.userHasName ? "release_device" : "transfer";
}
