import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { getAuth } from "@/lib/auth";
import { env } from "@/lib/env";
import { DEVICE_COOKIE, verifyDeviceCookie } from "@/lib/device";
import { can, type Capability, type Viewer } from "@/lib/authz/policy";
import { getPlan } from "@/lib/services/entitlements";

// Resolves who is making this request, once per request. Identity comes
// only from the signed device cookie (set by proxy.ts) and the Better Auth
// session cookie — never from request bodies or query strings.
export const getViewer = cache(async (): Promise<Viewer> => {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);
  const deviceId =
    (await verifyDeviceCookie(cookieStore.get(DEVICE_COOKIE)?.value, env().DEVICE_COOKIE_SECRET)) ??
    // proxy.ts issues the cookie on every matched request, so this ephemeral
    // id only covers requests that bypass the proxy.
    crypto.randomUUID();

  const session = await getAuth().api.getSession({ headers: headerList });
  if (!session) {
    return { userId: null, deviceId, email: null, name: null, role: null, plan: "free" };
  }
  return {
    userId: session.user.id,
    deviceId,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role === "admin" ? "admin" : "user",
    plan: await getPlan(session.user.id),
  };
});

export class ForbiddenError extends Error {
  constructor(public readonly capability: Capability) {
    super(`Missing capability ${capability}`);
  }
}

export async function requireCapability(capability: Capability): Promise<Viewer> {
  const viewer = await getViewer();
  if (!can(viewer, capability)) throw new ForbiddenError(capability);
  return viewer;
}
