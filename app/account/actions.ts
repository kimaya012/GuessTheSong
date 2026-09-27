"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getViewer } from "@/lib/viewer";
import { rateLimit } from "@/lib/rate-limit";
import { removeLinkedEmail, requestLinkedEmail } from "@/lib/services/linked-emails";

export interface ActionState {
  ok: boolean;
  message: string;
}

export async function linkEmailAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const viewer = await getViewer();
  if (!viewer.userId) return { ok: false, message: "Please sign in first." };

  const parsed = z.email().safeParse(String(formData.get("email") ?? "").trim());
  if (!parsed.success) return { ok: false, message: "That doesn't look like an email address." };

  const limit = await rateLimit(`link-email:${viewer.userId}`, 5, 3600);
  if (!limit.ok) return { ok: false, message: "Too many requests — try again in a little while." };

  await requestLinkedEmail(viewer.userId, parsed.data);
  revalidatePath("/account");
  // Same message whether or not the address was eligible (no enumeration).
  return { ok: true, message: `If ${parsed.data} can receive mail, a confirmation link is on its way.` };
}

export async function removeLinkedEmailAction(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (!viewer.userId) return;
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return;
  await removeLinkedEmail(viewer.userId, id.data);
  revalidatePath("/account");
}
