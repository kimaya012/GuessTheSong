# GuessTheBollySong v2 — Reference-parity scoring, accounts & tiers, redesign, monetization

Date: 2026-09-27 · Status: approved in chat (parts 1–4), pending written-spec review

## 0. Goals and non-goals

**Goals**
1. Replicate the scoring/game rules of guesstheaudio.com (deduced from its shipped JS bundle).
2. Accounts (Google + email magic link), role-based access control, and a Free/Premium split.
3. Premium sold through a Buy Me a Coffee (BMC) monthly membership, applied via signed webhooks.
4. A music-themed, modern, responsive UI with a hover-reactive 3D equalizer background.
5. AdSense monetization that never loads for Premium users, with a certified consent flow.
6. Secure-by-design throughout (server-authoritative game, least privilege, defense in depth).

**Non-goals (YAGNI)**: practice/unlimited mode, leaderboards, native apps, multiple payment
providers, i18n, a light theme (the redesign is dark-first; the old theme toggle is removed).

## 1. Reference analysis (guesstheaudio.com)

| Mechanic | Reference behaviour | Our implementation |
| --- | --- | --- |
| Guesses | 6 | same |
| Snippet lengths per guess | 0.4s, 1s, 2s, 5s, 7s, 9s | same |
| Hints | guess 2 length · 3 release year · 4 genre · 5 album · 6 artist | same |
| Points | win on guess r → `max(0, 6 − r + 1)` (6…1), loss → 0 | same; give-up = loss |
| Stats | played, won, win %, current/max streak, total/avg/best points, distribution 1–6 + loss | same, plus Premium "deep stats" |
| Streak | iterate puzzles in number order: win → +1, loss → reset to 0, unplayed → ignored, in-progress → counts as played, no streak change | same (stats are *derived* from attempts, never incrementally mutated — fixes current streak bugs) |
| Rank | by **total wins**, thresholds 0,5,10,20,40,80,150,200,250,300,350,400,430,470,500,530,560,600,630,700,750,800,900,1000,1100,1300 | same thresholds, our own Bollywood-flavoured names |
| Share | `#Tag #N` + one emoji per guess (⬛ skipped, 🟥 wrong, 🟩 correct, ⬜ unused) + link | same, plus 👑 when Premium |

This replaces the current 10,000-point budget, exponential skip penalty and paid "+1s" extend.

## 2. Roles, tiers and authorization (part 1 — approved)

- **Role** (authority, rarely changes): `user` | `admin`. Stored on the auth `user` row.
  Bootstrap admins via `ADMIN_EMAILS` (applied on sign-in when the email is verified).
- **Plan** (what was paid for): derived from `entitlements`. Premium ⇔ a row for the user with
  `status ∈ {active, cancelled}` and `current_period_end > now()`. Lapses need no job.
- Every request builds one server-side `Viewer { userId?, deviceId, role, plan, capabilities }`.
  All checks go through `lib/authz/policy.ts` → `can(viewer, capability)`.
- Enforcement lives in route handlers / server components next to the data. `proxy.ts` only
  does optimistic redirects (`/account`, `/admin`), CSP nonces and the device cookie.

| Capability | Guest | Free | Premium | Admin |
| --- | --- | --- | --- | --- |
| `puzzle:today` | ✅ | ✅ | ✅ | ✅ |
| `archive:recent` (last 7 days) | ✅ | ✅ | ✅ | ✅ |
| `archive:full` | — | — | ✅ | ✅ |
| `stats:cloud` (cross-device) | — | ✅ | ✅ | ✅ |
| `stats:deep` | — | — | ✅ | ✅ |
| `badge:premium` | — | — | ✅ | — |
| `ads:none` | — | — | ✅ | ✅ |
| `admin:*` | — | — | — | ✅ |

**Guest → account merge**: after sign-in, `/auth/complete` moves the device's attempts onto the
user. On a `(user, puzzle)` conflict the existing user attempt wins. Stats are recomputed.

## 3. Game engine and data model (part 2)

### 3.1 Rules module (`lib/game/rules.ts`, pure)
`MAX_GUESSES = 6`, `SNIPPET_SECONDS = [0.4, 1, 2, 5, 7, 9]`, `HINT_SCHEDULE` (guess → hint key),
`pointsFor(won, guessCount)`, `allowedSnippetSeconds(guessCount, completed)`, `rankForWins(n)`.

### 3.2 Stats module (`lib/game/stats.ts`, pure)
`deriveStats(attempts ordered by puzzleNumber)` → reference semantics above. Deep stats
(Premium): win rate and average points by decade and by genre, median time-to-solve.

### 3.3 Puzzle day
Puzzle days roll over at midnight in `PUZZLE_TIMEZONE` (default `Asia/Kolkata`), not UTC.
`lib/date.ts` gets `todayInPuzzleTz()`; all "future date" checks use it.

### 3.4 Schema changes (Drizzle, versioned migrations via `drizzle-kit generate`)
- **Better Auth tables**: `user` (+ `role`, `banned`), `session`, `account`, `verification`,
  `rate_limit`. The unused `users` stub table is dropped.
- **`attempts`** (reworked): `id`, `puzzle_id`, `device_id?`, `user_id?`, `guesses jsonb`,
  `guess_count`, `status ('playing'|'won'|'lost')`, `points`, `started_at`, `completed_at?`.
  CHECK (`device_id` or `user_id` not null). Unique `(user_id, puzzle_id)` and partial unique
  `(device_id, puzzle_id) WHERE user_id IS NULL`. Drops `current_score`, `snippet_duration_sec`, `won`.
- **`user_stats`** dropped (stats are derived; a player has ≤ 1 row/day, so this is cheap).
- **`user_devices`**: + `last_seen_at`.
- **`puzzle_clips`**: `puzzle_id` PK, `mime`, `bytes bytea` (see 3.6).
- **`entitlements`**: `id`, `user_id?`, `email`, `source ('bmc'|'admin')`, `external_ref` unique,
  `status ('active'|'cancelled'|'expired')`, `current_period_end`, timestamps. `user_id` is null
  while a BMC supporter's email matches no verified account; it is attached on sign-up / link.
- **`linked_emails`**: `id`, `user_id`, `email` unique, `token_hash`, `token_expires_at`, `verified_at?`.
- **`webhook_events`**: `id` PK (provider event id, else sha256 of body), `provider`, `type`,
  `received_at`, `processed_at?`, `error?` — idempotency + admin visibility.
- **`audit_log`**: `id`, `actor_user_id`, `action`, `target`, `metadata jsonb`, `created_at`.
- **`rate_limit_buckets`**: `key`, `window_start`, `count` — fixed-window limiter for our own routes.

### 3.5 API surface
| Route | Notes |
| --- | --- |
| `GET /api/puzzle/[date]` | `date` = `today` or ISO. Shell for the viewer; answer only after completion. Archive dates older than 7 days → `403 PREMIUM_REQUIRED` unless `archive:full`. |
| `POST /api/puzzle/[date]/guess` | Body `{ songId: uuid|null, giveUp?: boolean }`. Identity comes from cookies, never the body. Runs in a transaction with `SELECT … FOR UPDATE`. |
| `GET /api/puzzle/[date]/clip` | Returns only the unlocked snippet (3.6); full preview after completion. `Cache-Control: private, no-store`. |
| `GET /api/catalog` | Unchanged shape (id/title/artist/album/year) for autocomplete. |
| `GET /api/archive?page=` | Adds `locked` per row for the viewer. |
| `GET /api/stats` | Viewer stats; `deep` block only with `stats:deep`. |
| `/api/auth/[...all]` | Better Auth handler. |
| `GET /auth/complete` | Post-sign-in: merge device → user, attach pending entitlements, redirect. |
| `POST /api/account/linked-emails` · `GET /api/account/linked-emails/verify` | Verified secondary email for BMC matching. |
| `POST /api/webhooks/bmc` | Signed webhook (part 3). |
| `/api/admin/*` | Grant/revoke premium, set role, toggle song, list webhook events. `admin:*` only; audited. |
| `GET /api/cron/ensure-puzzles` | Existing safety net; also reports puzzles missing clips. |
| `/extend` | **Removed.** |

### 3.6 Snippet delivery (anti-cheat)
Today the whole 30s preview is sent to the browser, so the answer is one "play full clip"
away. Instead `npm run puzzles:generate` (and a `clips:prepare` script) uses `ffmpeg-static`
**offline** to cut the first 9s of each scheduled song into CBR 128 kbps / 48 kHz MP3 with no
ID3/Xing header (constant 384-byte frames, 24 ms each), stored in `puzzle_clips`. The clip route
walks MP3 frame headers and returns only the frames covering `allowedSnippetSeconds` for the
viewer's current guess. Any prefix of whole MP3 frames is valid audio, so browsers play it
as-is. ≈144 KB per puzzle (~53 MB/year). No ffmpeg binary is needed at runtime on Vercel.
After completion the route streams the original full preview (answer already revealed).

## 4. Security design (part 3)

- **Server-authoritative game**: answers never leave the server before completion; snippet
  length enforced server-side (3.6); guesses validated against the DB in a locked transaction.
- **Identity**: device id moves from a client-chosen `localStorage` UUID sent in bodies/query
  strings to a server-issued, HMAC-signed, `httpOnly; Secure; SameSite=Lax` cookie
  (`gts_device`) set in `proxy.ts`. A request can no longer read or write another device's data.
- **Sessions**: Better Auth DB sessions (revocable), `httpOnly` cookies, built-in CSRF origin
  checks and rate limiting (DB storage). Magic-link responses never reveal whether an email exists.
- **Our mutating routes** check `Origin` against `BETTER_AUTH_URL` and are rate-limited per
  device/user/IP (`rate_limit_buckets`).
- **Validation**: Zod on every body, param and query; Drizzle parameterized queries only;
  env validated at boot (`lib/env.ts`) so a missing secret fails fast.
- **Webhooks**: raw body → HMAC-SHA256 with `BMC_WEBHOOK_SECRET` → `timingSafeEqual`;
  idempotent via `webhook_events`; unknown event types are recorded and ignored.
- **Email linking**: random 32-byte token, only its sha256 stored, 30-min expiry, single use.
- **Admin**: `admin:*` checked server-side on every admin route; every mutation writes `audit_log`.
- **Headers** (proxy + `next.config` headers): nonce-based CSP with `strict-dynamic`
  (AdSense and Google sign-in origins allowlisted), HSTS, `X-Content-Type-Options: nosniff`,
  `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy`, `frame-ancestors 'none'`.
- **Caching bug fix**: nothing identity- or day-dependent is served with `public` caching;
  `today` is resolved server-side.
- **Secrets hygiene**: no credentials in README; `.env.example` documents every variable.
- **Least privilege DB role** kept (`gtbs_app`, not a superuser).

## 5. Premium via Buy Me a Coffee

- Owner creates a monthly BMC membership and sets a webhook to `/api/webhooks/bmc`.
- Handled events: `membership.started`, `membership.updated`, `membership.cancelled`.
  Parsed with a tolerant Zod schema (supporter email, membership id, status, period end).
  Period end falls back to `now + 31 days` if absent; `cancelled` keeps access until period end.
  **Payload field names must be confirmed with BMC's "send test webhook" during setup.**
- Upsert `entitlements` by `external_ref` (BMC membership id). Match `email` against user
  emails and verified `linked_emails`; otherwise store with `user_id = null` until claimed.
- `/premium` page: perks table, "Join on Buy Me a Coffee" button (`NEXT_PUBLIC_BMC_MEMBERSHIP_URL`),
  and an instruction to use the same email as the account (or link it on `/account`).
- Admins can grant/revoke Premium manually (source `admin`), audited.

## 6. UI redesign (part 4)

- **Theme — "Neon Filmi Night"**: dark stage (#07060f → #140b24), neon magenta #ff2e88,
  marigold #ffb020, electric teal #18e0d0; glass panels (backdrop blur, 1px luminous borders);
  display font Unbounded, body Manrope. Tokens in `globals.css`.
- **3D equalizer field** (`components/stage/`): React Three Fiber, an `InstancedMesh` grid of
  bars (≈40×24 desktop, 20×12 mobile) on a tilted stage with fog. Pointer position is raycast onto
  the plane every frame (window-level listener, so the canvas can sit behind content) and drives
  a decaying ripple; an idle "breathing" wave runs otherwise. While a clip plays, a Web Audio
  `AnalyserNode` (shared through `AudioReactiveProvider`) maps frequency bins to columns, so the
  field dances to the song. Colour runs teal → magenta by height.
- **Performance / accessibility**: dynamically imported (`ssr: false`); DPR clamped to 1.75;
  paused when the tab is hidden; static gradient fallback for `prefers-reduced-motion`, missing
  WebGL, or ≤ 2 CPU cores; canvas is `aria-hidden` and non-interactive.
- **Foreground**: vinyl-record play button that spins while playing; a Heardle-style segmented
  timeline scaled 0.4/1/2/5/7/9 s; guess rows with state colours; hint chips; countdown to next
  puzzle; share card; cards tilt slightly toward the pointer on hover (CSS perspective).
- **Pages**: `/` game · `/archive` (locked rows show 👑 upsell) · `/archive/[date]` · `/stats`
  (+ deep stats for Premium, blurred teaser otherwise) · `/premium` · `/sign-in` · `/account`
  · `/admin` · `/privacy` · `/terms` · How-to-play dialog.
- **Responsive**: mobile-first, 16px gutters, no horizontal scroll at 360px.

## 7. Monetization — AdSense

- Root layout loads the AdSense script (with CSP nonce) only when `NEXT_PUBLIC_ADSENSE_CLIENT_ID`
  is set **and** the viewer lacks `ads:none`, so Premium users download no ad code at all.
- Slots: below the result card, every 8th archive row, bottom of stats. Never inside the active
  game board. Fixed min-height to avoid layout shift.
- Consent: Google "Privacy & messaging" (a Google-certified CMP) configured in the AdSense
  console. It is served through the same script, so no custom banner code.
- `/ads.txt` route from `ADSENSE_PUBLISHER_ID`; `/privacy` and `/terms` pages (AdSense requires them).

## 8. Environment variables

`DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `RESEND_API_KEY` (dev: magic links are logged to the server console
when unset), `EMAIL_FROM`, `DEVICE_COOKIE_SECRET`, `ADMIN_EMAILS`, `BMC_WEBHOOK_SECRET`,
`NEXT_PUBLIC_BMC_MEMBERSHIP_URL`, `CRON_SECRET`, `PUZZLE_TIMEZONE`,
`NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_ADSENSE_SLOT_RESULT`,
`NEXT_PUBLIC_ADSENSE_SLOT_ARCHIVE`, `NEXT_PUBLIC_ADSENSE_SLOT_STATS`.

## 9. Testing

- **Vitest unit tests** (new): rules (points, hints, snippet schedule), `deriveStats` streak
  semantics, rank thresholds, policy matrix, archive window, puzzle-day timezone, MP3 frame
  slicer, BMC signature verification and event → entitlement mapping, share text.
- **Checks**: `tsc --noEmit`, `eslint`, `next build`.
- **Runtime**: dev server + browser pass — guest play to completion, archive lock, sign-in via
  logged magic link, device merge, admin grant → Premium (ads gone, archive unlocked), signed test
  webhook via a local script, mobile width.

## 10. Build order

1. Foundation: Vitest, env validation, schema + migrations, timezone, rules/stats rewrite,
   device cookie, transactional guesses, clip pipeline.
2. Auth + RBAC + tiers + device merge + admin.
3. BMC webhook, linked emails, `/premium`.
4. UI redesign + 3D stage.
5. AdSense, CSP/security headers, legal pages, `ads.txt`.
6. Docs (README/DOCUMENTATION), remove committed credentials.
