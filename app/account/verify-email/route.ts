import { NextResponse, type NextRequest } from "next/server";
import { verifyLinkedEmail } from "@/lib/services/linked-emails";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/http";

export async function GET(req: NextRequest) {
  const limit = await rateLimit(`verify-email:${clientIp(req)}`, 20, 600);
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const result = limit.ok ? await verifyLinkedEmail(token) : null;
  const url = new URL("/account", req.url);
  url.searchParams.set("linked", result ? "ok" : "invalid");
  return NextResponse.redirect(url);
}
