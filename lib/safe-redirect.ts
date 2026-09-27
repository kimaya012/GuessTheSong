// Only same-site relative paths are allowed as post-auth destinations, so
// `?next=` can't be used as an open redirect (e.g. "//evil.com", "/\evil").
export function safeNextPath(value: string | null | undefined, fallback = "/"): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /\\|%5c/i.test(value)) return fallback;
  try {
    const url = new URL(value, "http://local.invalid");
    return url.origin === "http://local.invalid" ? `${url.pathname}${url.search}` : fallback;
  } catch {
    return fallback;
  }
}
