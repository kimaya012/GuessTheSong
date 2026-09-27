import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

// Fixed-window limiter backed by Postgres, so limits hold across serverless
// instances without extra infrastructure. Better Auth rate-limits its own
// endpoints separately.
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<{ ok: boolean; retryAfterSec: number }> {
  const windowMs = windowSec * 1000;
  const now = Date.now();
  const windowStart = new Date(Math.floor(now / windowMs) * windowMs);

  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit_buckets (key, window_start, count)
    VALUES (${key}, ${windowStart.toISOString()}, 1)
    ON CONFLICT (key, window_start)
    DO UPDATE SET count = rate_limit_buckets.count + 1
    RETURNING count
  `);
  const count = Number(result.rows[0]?.count ?? 1);

  // Opportunistic cleanup of stale windows (~1% of calls).
  if (Math.random() < 0.01) {
    await db.execute(sql`DELETE FROM rate_limit_buckets WHERE window_start < now() - interval '1 day'`);
  }

  const retryAfterSec = Math.ceil((windowStart.getTime() + windowMs - now) / 1000);
  return { ok: count <= limit, retryAfterSec };
}
