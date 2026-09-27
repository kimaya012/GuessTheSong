import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as schema from "@/db/schema";
import { env } from "@/lib/env";
import { actionEmailHtml, sendEmail } from "@/lib/email";

function createAuth() {
  const e = env();
  const google =
    e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET
      ? { google: { clientId: e.GOOGLE_CLIENT_ID, clientSecret: e.GOOGLE_CLIENT_SECRET } }
      : {};

  return betterAuth({
    appName: "GuessTheBollySong",
    baseURL: e.BETTER_AUTH_URL,
    secret: e.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    // No passwords anywhere: Google or a one-time email link.
    emailAndPassword: { enabled: false },
    socialProviders: google,
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google"] },
    },
    session: {
      expiresIn: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 60,
      customRules: {
        "/sign-in/magic-link": { window: 300, max: 5 },
      },
    },
    advanced: {
      useSecureCookies: e.BETTER_AUTH_URL.startsWith("https://"),
    },
    plugins: [
      magicLink({
        expiresIn: 60 * 10,
        storeToken: "hashed",
        async sendMagicLink({ email, url }) {
          await sendEmail({
            to: email,
            subject: "Your GuessTheBollySong sign-in link",
            text: `Sign in to GuessTheBollySong (link valid for 10 minutes):\n${url}`,
            html: actionEmailHtml(
              "Your sign-in link",
              "Tap the button to sign in. The link works once and expires in 10 minutes.",
              "Sign in",
              url,
            ),
          });
        },
      }),
      admin({ defaultRole: "user", adminRoles: ["admin"] }),
      nextCookies(), // must stay last
    ],
  });
}

type Auth = ReturnType<typeof createAuth>;
const globalForAuth = globalThis as unknown as { __gtbsAuth?: Auth };

// Built on first use so env validation happens at request time, not import.
export function getAuth(): Auth {
  if (!globalForAuth.__gtbsAuth) globalForAuth.__gtbsAuth = createAuth();
  return globalForAuth.__gtbsAuth;
}
