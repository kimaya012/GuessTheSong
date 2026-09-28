"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { songs, user } from "@/db/schema";
import { requireCapability } from "@/lib/viewer";
import { grantPremium, revokePremium } from "@/lib/services/entitlements";
import { writeAudit } from "@/lib/services/audit";

// Every action re-checks admin:access itself: server actions are public
// POST endpoints, so the page having checked is not enough.
const userId = z.string().min(1).max(64);

export async function grantPremiumAction(formData: FormData): Promise<void> {
  const admin = await requireCapability("admin:access");
  const input = z
    .object({ userId, days: z.coerce.number().int().min(1).max(366) })
    .parse({ userId: formData.get("userId"), days: formData.get("days") });
  await grantPremium(admin.userId!, input.userId, input.days);
  revalidatePath("/admin");
}

export async function revokePremiumAction(formData: FormData): Promise<void> {
  const admin = await requireCapability("admin:access");
  await revokePremium(admin.userId!, userId.parse(formData.get("userId")));
  revalidatePath("/admin");
}

export async function setRoleAction(formData: FormData): Promise<void> {
  const admin = await requireCapability("admin:access");
  const input = z
    .object({ userId, role: z.enum(["user", "admin"]) })
    .parse({ userId: formData.get("userId"), role: formData.get("role") });
  if (input.userId === admin.userId && input.role !== "admin") {
    throw new Error("You can't remove your own admin role.");
  }
  await db.update(user).set({ role: input.role }).where(eq(user.id, input.userId));
  await writeAudit(admin.userId, "role.set", input.userId, { role: input.role });
  revalidatePath("/admin");
}

export async function toggleSongAction(formData: FormData): Promise<void> {
  const admin = await requireCapability("admin:access");
  const input = z
    .object({ songId: z.uuid(), active: z.enum(["true", "false"]) })
    .parse({ songId: formData.get("songId"), active: formData.get("active") });
  await db.update(songs).set({ active: input.active === "true" }).where(eq(songs.id, input.songId));
  await writeAudit(admin.userId, "song.set_active", input.songId, { active: input.active === "true" });
  revalidatePath("/admin");
}
