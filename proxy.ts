import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { DEVICE_COOKIE, DEVICE_COOKIE_MAX_AGE, signDeviceId, verifyDeviceCookie } from "@/lib/device";

// Runs before every page and API request:
//  1. issues the signed anonymous device cookie,
//  2. sets a per-request nonce CSP on pages,
//  3. optimistic redirect for signed-out visits to /account and /admin
//     (real authorization happens server-side next to the data).
const GOOGLE_ADS = [
  "https://*.google.com",
  "https://*.googlesyndication.com",
  "https://*.doubleclick.net",
  "https://*.adtrafficquality.google",
  "https://*.gstatic.com",
  "https://fundingchoicesmessages.google.com",
].join(" ");

function contentSecurityPolicy(nonce: string, isDev: boolean): string {
  return [
    `default-src 'self'`,
    // 'strict-dynamic' lets the nonced AdSense loader pull in its own
    // scripts; 'https:' is only a fallback for browsers without it.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' https:${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob: https:`,
    `media-src 'self' blob:`,
    `font-src 'self' data:`,
    `connect-src 'self' ${GOOGLE_ADS}${isDev ? " ws:" : ""}`,
    `frame-src ${GOOGLE_ADS}`,
    `worker-src 'self' blob:`,
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

const PROTECTED_PREFIXES = ["/account", "/admin"];

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const isDev = process.env.NODE_ENV !== "production";
  const secret = process.env.DEVICE_COOKIE_SECRET || (isDev ? "dev-only-device_cookie_secret-not-for-production" : "");

  if (PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`)) && pathname !== "/account/verify-email") {
    if (!getSessionCookie(request)) {
      const url = new URL("/sign-in", request.url);
      url.searchParams.set("next", `${pathname}${search}`);
      return NextResponse.redirect(url);
    }
  }

  const requestHeaders = new Headers(request.headers);

  let newDeviceCookie: string | null = null;
  if (secret) {
    const existing = await verifyDeviceCookie(request.cookies.get(DEVICE_COOKIE)?.value, secret);
    if (!existing) {
      newDeviceCookie = await signDeviceId(crypto.randomUUID(), secret);
      // Make the new cookie visible to this same request's handlers.
      request.cookies.set(DEVICE_COOKIE, newDeviceCookie);
      requestHeaders.set("cookie", request.cookies.toString());
    }
  }

  const isPage = !pathname.startsWith("/api/");
  let csp: string | null = null;
  if (isPage) {
    const nonce = btoa(crypto.randomUUID());
    csp = contentSecurityPolicy(nonce, isDev);
    requestHeaders.set("x-nonce", nonce);
    requestHeaders.set("Content-Security-Policy", csp);
  }

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  if (csp) response.headers.set("Content-Security-Policy", csp);
  if (newDeviceCookie) {
    response.cookies.set(DEVICE_COOKIE, newDeviceCookie, {
      httpOnly: true,
      secure: !isDev,
      sameSite: "lax",
      path: "/",
      maxAge: DEVICE_COOKIE_MAX_AGE,
    });
  }
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!_next/static|_next/image|favicon.ico|ads.txt|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico|txt)$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
