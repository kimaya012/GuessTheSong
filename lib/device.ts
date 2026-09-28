// Anonymous players are identified by a server-issued device id carried in
// an HMAC-signed, httpOnly cookie. Clients can't choose or read another
// device's id, unlike the old localStorage UUID sent in request bodies.
// Uses Web Crypto so it works in proxy.ts and route handlers alike.
export const DEVICE_COOKIE = "gts_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function toBase64Url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const b of new Uint8Array(bytes)) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(value: string, secret: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toBase64Url(await crypto.subtle.sign("HMAC", key, encoder.encode(value)));
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signDeviceId(id: string, secret: string): Promise<string> {
  return `${id}.${await hmac(id, secret)}`;
}

export async function verifyDeviceCookie(value: string | undefined, secret: string): Promise<string | null> {
  if (!value) return null;
  const dot = value.indexOf(".");
  if (dot <= 0) return null;
  const id = value.slice(0, dot);
  const signature = value.slice(dot + 1);
  if (!UUID_RE.test(id) || !signature) return null;
  return constantTimeEqual(signature, await hmac(id, secret)) ? id.toLowerCase() : null;
}
