import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { playerNames } from "@/db/schema";
import type { Viewer } from "@/lib/authz/policy";
import { checkNameFormat, nameKey, type NameFormatReason } from "@/lib/names/rules";
import { isNameAllowed } from "@/lib/names/blocklist";
import {
  NAME_CHANGE_COOLDOWN_DAYS,
  canChangeName,
  planNameMerge,
  type NameChangeDecision,
  type NameMergePlan,
} from "@/lib/names/policy";
import { generateCandidates } from "@/lib/names/generator";
import { touchDevice } from "@/lib/services/puzzles";
import { writeAudit } from "@/lib/services/audit";

export interface PlayerName {
  name: string;
  changedAt: Date;
}

export type ClaimResult =
  | { ok: true; name: string; changedAt: Date }
  | { ok: false; code: "INVALID_NAME"; reason: NameFormatReason | "NOT_ALLOWED" }
  | { ok: false; code: "NAME_TAKEN" }
  | { ok: false; code: "SIGN_IN_REQUIRED" }
  | { ok: false; code: "COOLDOWN"; retryAt: Date };

// A guest's name belongs to their device; a signed-in player's to their account.
function ownerFilter(viewer: Viewer) {
  return viewer.userId
    ? eq(playerNames.userId, viewer.userId)
    : and(eq(playerNames.deviceId, viewer.deviceId), isNull(playerNames.userId));
}

export async function getPlayerName(viewer: Viewer): Promise<PlayerName | null> {
  const [row] = await db
    .select({ name: playerNames.name, changedAt: playerNames.changedAt })
    .from(playerNames)
    .where(ownerFilter(viewer))
    .limit(1);
  return row ?? null;
}

export function changeDecision(viewer: Viewer, current: PlayerName | null, now = Date.now()): NameChangeDecision {
  return canChangeName({ signedIn: !!viewer.userId, changedAt: current ? current.changedAt.getTime() : null, now });
}

// pg reports a unique violation as code 23505; drizzle may wrap the error.
function uniqueViolation(err: unknown): { constraint?: string } | null {
  const e = err as { code?: string; constraint?: string; cause?: { code?: string; constraint?: string } };
  if (e?.code === "23505") return { constraint: e.constraint };
  if (e?.cause?.code === "23505") return { constraint: e.cause.constraint };
  return null;
}

export async function claimName(viewer: Viewer, raw: string): Promise<ClaimResult> {
  const format = checkNameFormat(raw);
  if (!format.ok) return { ok: false, code: "INVALID_NAME", reason: format.reason };
  const name = format.name;
  // Same reason for every moderation failure so the word list is not revealed.
  if (!isNameAllowed(name)) return { ok: false, code: "INVALID_NAME", reason: "NOT_ALLOWED" };

  const current = await getPlayerName(viewer);
  if (current?.name === name) return { ok: true, name, changedAt: current.changedAt };

  const decision = changeDecision(viewer, current);
  if (!decision.ok) {
    return decision.reason === "SIGN_IN_REQUIRED"
      ? { ok: false, code: "SIGN_IN_REQUIRED" }
      : { ok: false, code: "COOLDOWN", retryAt: new Date(decision.retryAt) };
  }

  const changedAt = new Date();
  try {
    if (current) {
      await db
        .update(playerNames)
        .set({ name, nameKey: nameKey(name), changedAt })
        .where(ownerFilter(viewer));
    } else {
      if (!viewer.userId) await touchDevice(viewer.deviceId); // the row references the device
      await db.insert(playerNames).values({
        name,
        nameKey: nameKey(name),
        userId: viewer.userId,
        deviceId: viewer.userId ? null : viewer.deviceId,
        changedAt,
      });
    }
  } catch (err) {
    const violation = uniqueViolation(err);
    if (violation?.constraint === "player_names_name_key_idx") return { ok: false, code: "NAME_TAKEN" };
    throw err;
  }
  return { ok: true, name, changedAt };
}

// Up to `count` suggestions that are valid and not currently taken. Nothing
// is reserved: a suggestion can still be claimed by someone else first.
export async function suggestNames(count = 3): Promise<string[]> {
  const found: string[] = [];
  for (let round = 0; round < 3 && found.length < count; round++) {
    const batch = generateCandidates(count * 4).filter((n) => !found.some((f) => f.toLowerCase() === n.toLowerCase()));
    const taken = new Set(
      (await db.select({ key: playerNames.nameKey }).from(playerNames).where(inArray(playerNames.nameKey, batch.map(nameKey)))).map(
        (r) => r.key,
      ),
    );
    for (const name of batch) if (!taken.has(nameKey(name)) && found.length < count) found.push(name);
  }
  return found;
}

// On sign-in a guest's name moves to their account (or is freed, if the
// account already has one).
export async function mergeDeviceNameIntoUser(deviceId: string, userId: string): Promise<NameMergePlan> {
  return db.transaction(async (tx) => {
    const [deviceRow] = await tx
      .select({ id: playerNames.id })
      .from(playerNames)
      .where(and(eq(playerNames.deviceId, deviceId), isNull(playerNames.userId)))
      .limit(1);
    const [userRow] = await tx.select({ id: playerNames.id }).from(playerNames).where(eq(playerNames.userId, userId)).limit(1);

    const plan = planNameMerge({ userHasName: !!userRow, deviceHasName: !!deviceRow });
    if (plan === "transfer") {
      // The guest was told "sign in to change your name", so signing in must
      // unlock that change right away. Backdate the last change past the
      // cooldown; it applies again from their next change.
      const eligibleNow = new Date(Date.now() - NAME_CHANGE_COOLDOWN_DAYS * 86_400_000);
      await tx
        .update(playerNames)
        .set({ userId, deviceId: null, changedAt: eligibleNow })
        .where(eq(playerNames.id, deviceRow.id));
    } else if (plan === "release_device") {
      await tx.delete(playerNames).where(eq(playerNames.id, deviceRow.id));
    }
    return plan;
  });
}

export async function getNamesForUsers(userIds: string[]): Promise<Map<string, string>> {
  if (userIds.length === 0) return new Map();
  const rows = await db
    .select({ userId: playerNames.userId, name: playerNames.name })
    .from(playerNames)
    .where(inArray(playerNames.userId, userIds));
  return new Map(rows.flatMap((r) => (r.userId ? [[r.userId, r.name] as const] : [])));
}

// Moderation: frees the name so the player can choose again.
export async function clearPlayerName(actorId: string, userId: string): Promise<boolean> {
  const removed = await db.delete(playerNames).where(eq(playerNames.userId, userId)).returning({ name: playerNames.name });
  if (removed.length === 0) return false;
  await writeAudit(actorId, "name.clear", userId, { name: removed[0].name });
  return true;
}
