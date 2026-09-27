// Authorises Google to sell ads on this domain (required by AdSense).
export function GET() {
  const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const publisher = client?.replace(/^ca-/, "");
  const body = publisher && /^pub-\d+$/.test(publisher) ? `google.com, ${publisher}, DIRECT, f08c47fec0942fa0\n` : "";
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
