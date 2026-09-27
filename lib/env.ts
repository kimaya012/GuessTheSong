import { z } from "zod";

// Validated lazily (on first use, not at import time) so `next build` can
// compile routes without every runtime secret present, while a request that
// actually needs a missing secret fails fast with a clear message.
const isProd = process.env.NODE_ENV === "production";

const secret = (name: string) =>
  isProd
    ? z.string().min(32, `${name} must be at least 32 characters in production`)
    : z.string().min(1).default(`dev-only-${name.toLowerCase()}-not-for-production`);

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() ? v.trim() : undefined));

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  BETTER_AUTH_SECRET: secret("BETTER_AUTH_SECRET"),
  BETTER_AUTH_URL: z.string().url().default("http://localhost:3000"),
  DEVICE_COOKIE_SECRET: secret("DEVICE_COOKIE_SECRET"),
  GOOGLE_CLIENT_ID: optional,
  GOOGLE_CLIENT_SECRET: optional,
  RESEND_API_KEY: optional,
  EMAIL_FROM: z.string().default("GuessTheBollySong <no-reply@localhost>"),
  ADMIN_EMAILS: z
    .string()
    .optional()
    .transform((v) =>
      (v ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  BMC_WEBHOOK_SECRET: optional,
  NEXT_PUBLIC_BMC_MEMBERSHIP_URL: optional,
  CRON_SECRET: optional,
  PUZZLE_TIMEZONE: z.string().default("Asia/Kolkata"),
  NEXT_PUBLIC_ADSENSE_CLIENT_ID: optional,
  NEXT_PUBLIC_ADSENSE_SLOT_RESULT: optional,
  NEXT_PUBLIC_ADSENSE_SLOT_ARCHIVE: optional,
  NEXT_PUBLIC_ADSENSE_SLOT_STATS: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
    throw new Error(`Invalid environment configuration — ${issues}`);
  }
  cached = parsed.data;
  return cached;
}
