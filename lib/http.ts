import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export const NO_STORE = { "Cache-Control": "private, no-store" } as const;

export function jsonError(code: string, status: number, extra: Record<string, unknown> = {}) {
  return NextResponse.json({ error: code, ...extra }, { status, headers: NO_STORE });
}

export function jsonOk(body: unknown, init: { status?: number; headers?: Record<string, string> } = {}) {
  return NextResponse.json(body, { status: init.status ?? 200, headers: { ...NO_STORE, ...init.headers } });
}

// CSRF defence for cookie-authenticated mutations: browsers always send
// Origin on cross-origin POSTs, so require it to be ours.
export function isSameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return req.headers.get("sec-fetch-site") === "same-origin";
  const allowed = new Set<string>([new URL(env().BETTER_AUTH_URL).origin]);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (host) {
    const proto = req.headers.get("x-forwarded-proto") ?? new URL(req.url).protocol.replace(":", "");
    allowed.add(`${proto}://${host}`);
  }
  return allowed.has(origin);
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}
