# GuessTheBollySong v2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reference-parity scoring, Google + magic-link accounts with RBAC and a Free/Premium split
paid through Buy Me a Coffee, a neon music-themed UI over a hover-reactive 3D equalizer, and
AdSense that never loads for Premium — all secure by design.

**Architecture:** Pure, unit-tested domain modules (`lib/game`, `lib/authz`, `lib/audio`,
`lib/billing`) wrapped by thin DB services and route handlers. Every request resolves one
server-side `Viewer`; every gate is `can(viewer, capability)`. Better Auth owns sessions in our
Postgres. Snippets are pre-cut MP3 prefixes served per unlocked guess.

**Tech Stack:** Next.js 16.3 (App Router, `proxy.ts`), React 19.2, TypeScript, Tailwind v4,
Drizzle ORM 0.45 + drizzle-kit 0.31 on PostgreSQL, Better Auth 1.7 (magic-link, admin, Google),
Resend, React Three Fiber 9 + three 0.186, ffmpeg-static 5 (scripts only), Vitest 5, Zod 4.

**Spec:** `docs/superpowers/specs/2026-09-27-premium-redesign-design.md`

## Global Constraints

- Next 16: middleware is `proxy.ts` (export `proxy`); request APIs (`params`, `cookies()`, `headers()`) are async.
- 6 guesses; snippet seconds `[0.4, 1, 2, 5, 7, 9]`; hints before guess 2..6: length, releaseYear, genre, album, artist.
- Points: won on guess r → `max(0, 7 − r)`; lost/give-up → 0.
- Streak: puzzle-number order; won +1, lost → 0, unplayed ignored, playing counts as played only.
- Rank by total wins; thresholds 0,5,10,20,40,80,150,200,250,300,350,400,430,470,500,530,560,600,630,700,750,800,900,1000,1100,1300.
- Free archive window: 7 days before today (puzzle timezone). Puzzle timezone default `Asia/Kolkata`.
- Identity never comes from request bodies/query strings: device = signed httpOnly cookie `gts_device`; user = Better Auth session.
- Identity- or day-dependent responses are `Cache-Control: private, no-store`.
- Every mutating non-auth route: same-origin check + rate limit + Zod validation.
- No ad script for viewers with `ads:none`. No ads inside the active game board.
- Dark-only theme. Tokens: stage #07060f/#140b24, magenta #ff2e88, marigold #ffb020, teal #18e0d0. Fonts: Unbounded (display), Manrope (body).
- 3D stage: `aria-hidden`, paused when hidden, static fallback for reduced motion / no WebGL / ≤2 cores.

## File map

| Area | Files |
| --- | --- |
| Domain (pure) | `lib/game/rules.ts`, `lib/game/ranks.ts`, `lib/game/stats.ts`, `lib/game/share.ts`, `lib/authz/policy.ts`, `lib/audio/mp3.ts`, `lib/billing/bmc.ts`, `lib/device.ts`, `lib/date.ts` |
| Infra | `lib/env.ts`, `lib/db.ts`, `lib/auth.ts`, `lib/auth-client.ts`, `lib/email.ts`, `lib/rate-limit.ts`, `lib/http.ts`, `lib/viewer.ts` |
| Services (DB) | `lib/services/puzzles.ts`, `lib/services/stats.ts`, `lib/services/entitlements.ts`, `lib/services/linked-emails.ts`, `lib/services/audit.ts` |
| Schema | `db/schema.ts`, `db/auth-schema.ts`, `drizzle/*` migrations |
| Scripts | `scripts/generate-puzzles.ts`, `scripts/prepare-clips.ts`, `lib/audio/transcode.ts`, `scripts/send-test-webhook.ts` |
| Routes | `proxy.ts`, `app/api/auth/[...all]`, `app/api/puzzle/[date]/{route,guess,clip}`, `app/api/archive`, `app/api/stats`, `app/api/webhooks/bmc`, `app/auth/complete`, `app/account/verify-email`, `app/ads.txt` |
| Pages | `/`, `/archive`, `/archive/[date]`, `/stats`, `/premium`, `/sign-in`, `/account`, `/admin`, `/privacy`, `/terms` |
| UI | `components/stage/*`, `components/game/*`, `components/layout/*`, `components/ads/*`, `components/ui/tilt-card.tsx` |
| Tests | `tests/**/*.test.ts` |

---

### Task 1: Test harness, env validation, puzzle-day dates

**Files:** Create `vitest.config.ts`, `lib/env.ts`, `tests/date.test.ts`. Modify `lib/date.ts`, `package.json` (scripts `test`, `test:watch`).

**Produces:** `todayInTz(tz?: string, now?: Date): string`, `addDays(date: string, n: number): string`,
`daysBetween(a: string, b: string): number`, `isValidDateString(s): boolean`,
`msUntilNextPuzzle(tz?: string, now?: Date): number`, `PUZZLE_TIMEZONE`; `env()` (zod-validated, lazy, cached).

- [ ] Write `tests/date.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { todayInTz, addDays, daysBetween, isValidDateString, msUntilNextPuzzle } from "@/lib/date";

describe("puzzle-day dates", () => {
  it("rolls over at IST midnight, not UTC", () => {
    // 2026-09-27T19:00Z = 2026-09-28 00:30 IST
    expect(todayInTz("Asia/Kolkata", new Date("2026-09-27T19:00:00Z"))).toBe("2026-09-28");
    expect(todayInTz("UTC", new Date("2026-09-27T19:00:00Z"))).toBe("2026-09-27");
  });
  it("adds and diffs days across month ends", () => {
    expect(addDays("2026-09-28", 5)).toBe("2026-10-03");
    expect(daysBetween("2026-09-21", "2026-09-28")).toBe(7);
  });
  it("validates strict YYYY-MM-DD", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-9-1")).toBe(false);
    expect(isValidDateString("2026-09-01")).toBe(true);
  });
  it("counts down to the next IST midnight", () => {
    expect(msUntilNextPuzzle("Asia/Kolkata", new Date("2026-09-27T18:00:00Z"))).toBe(30 * 60 * 1000);
  });
});
```
- [ ] Run `npx vitest run tests/date.test.ts` → FAIL (exports missing).
- [ ] Implement `lib/date.ts` with `Intl.DateTimeFormat("en-CA", { timeZone })`; strict validation round-trips through `Date.UTC`; `msUntilNextPuzzle` computes the tz offset from formatted parts.
- [ ] Implement `lib/env.ts`: Zod object for every var in spec §8 (secrets `min(32)` in production, optional in dev), `env()` caches the parse.
- [ ] Run tests → PASS. Commit `chore: add vitest, env validation, timezone-aware puzzle days`.

### Task 2: Game rules, ranks, share text

**Files:** Create `lib/game/rules.ts`, `lib/game/ranks.ts`, `lib/game/share.ts`, `tests/game/rules.test.ts`, `tests/game/share.test.ts`. Delete `lib/constants.ts`, `lib/roles.ts` (after Task 6 removes their importers).

**Produces:**
```ts
export const MAX_GUESSES = 6;
export const SNIPPET_SECONDS = [0.4, 1, 2, 5, 7, 9] as const;
export type HintKey = "length" | "releaseYear" | "genre" | "album" | "artist";
export const HINT_SCHEDULE: readonly HintKey[];
export type GuessKind = "skip" | "wrong" | "correct" | "giveup";
export interface GuessRecord { kind: GuessKind; songId: string | null; title: string; at: number }
export type AttemptStatus = "playing" | "won" | "lost";
export function snippetSecondsFor(guessCount: number): number;
export function hintsUnlocked(guessCount: number, completed: boolean): HintKey[];
export function pointsFor(status: AttemptStatus, guessCount: number): number;
export function nextState(prev: { guesses: GuessRecord[] }, guess: GuessRecord): { guesses: GuessRecord[]; status: AttemptStatus; guessCount: number; points: number };
// ranks.ts
export interface Rank { minWins: number; name: string }
export const RANKS: readonly Rank[];
export function rankForWins(wins: number): { current: Rank; next: Rank | null; winsToNext: number | null };
// share.ts
export function buildShareText(i: { puzzleNumber: number; guesses: GuessRecord[]; status: AttemptStatus; url: string; premium: boolean }): string;
```
- [ ] Write `tests/game/rules.test.ts` covering: `pointsFor("won",1)=6`, `("won",6)=1`, `("lost",6)=0`, `("playing",2)=0`; `snippetSecondsFor(0)=0.4`, `(5)=9`, `(9)=9`; `hintsUnlocked(0,false)=[]`, `(1,false)=["length"]`, `(5,false)` = all five, `(1,true)` = all five; `nextState` → correct guess ends `won`, 6th wrong ends `lost`, `giveup` ends `lost` with points 0; `rankForWins(0).current.name` is first rank, `rankForWins(5).current.minWins=5`, `rankForWins(1300).next=null`, `rankForWins(7).winsToNext=3`.
- [ ] Write `tests/game/share.test.ts`: won on guess 3 after skip + wrong → line `⬛ 🟥 🟩 ⬜ ⬜ ⬜`, first line `#GuessTheBollySong #12`, contains url, contains `👑` only when premium.
- [ ] Run → FAIL. Implement. Run → PASS. Commit `feat(game): reference-parity rules, ranks and share text`.

### Task 3: Derived stats (standard + deep)

**Files:** Create `lib/game/stats.ts`, `tests/game/stats.test.ts`.

**Produces:**
```ts
export interface AttemptSummary { puzzleNumber: number; status: AttemptStatus; guessCount: number; points: number; startedAt: Date; completedAt: Date | null; year: number | null; genre: string | null }
export interface PlayerStats { played: number; won: number; winPercentage: number; currentStreak: number; maxStreak: number; totalPoints: number; averagePoints: number; bestPoints: number; distribution: number[]; rank: ReturnType<typeof rankForWins> }
export interface StatBucket { label: string; played: number; won: number; winPercentage: number; averagePoints: number }
export interface DeepStats { byDecade: StatBucket[]; byGenre: StatBucket[]; medianSolveSeconds: number | null }
export function deriveStats(attempts: AttemptSummary[]): PlayerStats;
export function deriveDeepStats(attempts: AttemptSummary[]): DeepStats;
```
- [ ] Tests: empty → zeros and first rank; sequence W(1) W(3) [gap] L W(2) W(6) in shuffled order → played 5, won 4, win% 80, current 2, max 2, total 6+4+5+1=16, best 6, avg 4, distribution `[1,1,0,0,0,1,1]`; a `playing` attempt counts as played without touching streak; deep stats bucket 1994 → "1990s", null year → "Unknown", median of solve durations for won games only.
- [ ] FAIL → implement → PASS. Commit `feat(game): derive stats from attempt history`.

### Task 4: Authorization policy and device cookie

**Files:** Create `lib/authz/policy.ts`, `lib/device.ts`, `tests/authz/policy.test.ts`, `tests/device.test.ts`.

**Produces:**
```ts
export type Role = "user" | "admin"; export type Plan = "free" | "premium";
export type Capability = "puzzle:today" | "archive:recent" | "archive:full" | "stats:cloud" | "stats:deep" | "badge:premium" | "ads:none" | "admin:access";
export interface Viewer { userId: string | null; deviceId: string; email: string | null; name: string | null; role: Role | null; plan: Plan }
export const ARCHIVE_FREE_DAYS = 7;
export function tierOf(v: Viewer): "guest" | "free" | "premium" | "admin";
export function can(v: Viewer, c: Capability): boolean;
export function puzzleAccess(v: Viewer, date: string, today: string): "ok" | "future" | "premium_required";
// device.ts (Web Crypto, works in proxy and route handlers)
export const DEVICE_COOKIE = "gts_device";
export async function signDeviceId(id: string, secret: string): Promise<string>; // `${id}.${base64url(hmac)}`
export async function verifyDeviceCookie(value: string | undefined, secret: string): Promise<string | null>;
```
- [ ] Policy tests assert the full capability matrix of spec §2 for four viewers, plus `puzzleAccess`: today ok for guest, today−7 ok for guest, today−8 `premium_required` for free, ok for premium; tomorrow `future` for admin.
- [ ] Device tests: round-trip; tampered signature → null; wrong secret → null; non-UUID id → null; missing → null.
- [ ] FAIL → implement → PASS. Commit `feat(authz): capability policy and signed device cookie`.

### Task 5: MP3 frame slicer + BMC webhook domain

**Files:** Create `lib/audio/mp3.ts`, `lib/billing/bmc.ts`, `tests/audio/mp3.test.ts`, `tests/billing/bmc.test.ts`.

**Produces:**
```ts
export function sliceMp3ToSeconds(buf: Uint8Array, seconds: number): Uint8Array; // whole MPEG-1/2 Layer III frames covering >= seconds; skips a leading ID3v2 tag
export function mp3DurationSeconds(buf: Uint8Array): number;
// bmc.ts
export function verifyBmcSignature(rawBody: string, signature: string | null, secret: string): boolean;
export interface BmcMembershipEvent { eventId: string; type: "membership.started" | "membership.updated" | "membership.cancelled"; email: string; membershipId: string; periodEnd: Date; cancelled: boolean }
export function parseBmcEvent(payload: unknown, rawBody: string, now?: Date): BmcMembershipEvent | { ignored: string };
export function entitlementStatusFor(e: BmcMembershipEvent, now?: Date): "active" | "cancelled" | "expired";
```
- [ ] mp3 tests build synthetic 48 kHz/128 kbps frames (header `FF FB 94 64`, 384 bytes each, 24 ms): 0.4 s → 17 frames (6528 bytes); 9 s of a 10 s buffer → 375 frames; request beyond length → whole buffer; leading ID3v2 (10-byte header + size) is skipped in output; garbage input → empty array.
- [ ] bmc tests: valid HMAC-SHA256 hex over raw body → true; one flipped char / missing header → false; parse `membership.started` with `data.supporter_email`, `data.id`, `data.current_period_end` (unix s) → normalised event (email lowercased); missing period end → now + 31 days; `donation.created` → `{ ignored }`; eventId falls back to sha256(rawBody); cancelled with future period end → "cancelled", past → "expired".
- [ ] FAIL → implement → PASS. Commit `feat: mp3 snippet slicer and BMC webhook parsing`.

### Task 6: Database schema v2 + migration + DB services for gameplay

**Files:** Create `db/auth-schema.ts`, `lib/services/puzzles.ts`, `lib/services/stats.ts`, `lib/rate-limit.ts`, `lib/http.ts`. Modify `db/schema.ts`, `drizzle.config.ts` (out `./drizzle`), `lib/db.ts` (lazy pool, `server-only`), `package.json` scripts (`db:generate`, `db:migrate`).

**Consumes:** Tasks 1–5. **Produces:**
```ts
// lib/services/puzzles.ts
export interface PuzzleShell { puzzleNumber: number; date: string; maxGuesses: number; snippetSeconds: number; snippetSchedule: readonly number[]; hints: Partial<Record<HintKey, string | number | null>>; guesses: GuessRecord[]; guessCount: number; status: AttemptStatus; points: number; answer?: { title: string; artist: string; album: string | null; year: number | null; genre: string | null; durationSec: number | null; coverImageUrl: string | null; externalUrl: string | null } }
export async function getPuzzleShell(viewer: Viewer, date: string): Promise<PuzzleShell | null>;
export async function submitGuess(viewer: Viewer, date: string, input: { songId: string | null; giveUp: boolean }): Promise<PuzzleShell>; // throws GameError("NO_PUZZLE"|"ALREADY_COMPLETED"|"UNKNOWN_SONG")
export async function getClip(viewer: Viewer, date: string): Promise<{ bytes: Uint8Array; mime: string } | null>;
export async function mergeDeviceIntoUser(deviceId: string, userId: string): Promise<number>;
// lib/services/stats.ts
export async function getAttemptSummaries(viewer: Viewer): Promise<AttemptSummary[]>;
// lib/rate-limit.ts
export async function rateLimit(key: string, limit: number, windowSec: number): Promise<{ ok: boolean; retryAfterSec: number }>;
// lib/http.ts
export function isSameOrigin(req: Request): boolean; export function jsonError(code: string, status: number, extra?: object): Response;
```
- [ ] Schema per spec §3.4 (Better Auth tables: `user`, `session`, `account`, `verification`, `rate_limit` with admin-plugin fields `role`, `banned`, `banReason`, `banExpires`, `impersonatedBy`; text ids). `attempts` owner = `user_id` when signed in else `device_id` with `user_id IS NULL`.
- [ ] `npm run db:generate` then `npm run db:migrate` on a fresh database (existing dev data is disposable: dev-only, no users).
- [ ] `submitGuess` runs in `db.transaction` with `.for("update")` on the attempt row, uses `nextState`, rejects song ids not in `songs`.
- [ ] Verify with `npx tsc --noEmit`. Commit `feat(db): schema v2, transactional gameplay services`.

### Task 7: Clip pipeline

**Files:** Create `lib/audio/transcode.ts`, `scripts/prepare-clips.ts`. Modify `scripts/generate-puzzles.ts` (after inserting puzzles, prepare clips for any puzzle lacking one), `next.config.ts` (`serverExternalPackages: ["ffmpeg-static"]` not needed at runtime — scripts only), `package.json` (`clips:prepare`).

**Produces:** `transcodeFirstSeconds(url: string, seconds = 9): Promise<Uint8Array>` — spawns ffmpeg: `-i <url> -t 9 -vn -ac 2 -ar 48000 -c:a libmp3lame -b:a 128k -write_xing 0 -id3v2_version 0 -f mp3 pipe:1`.
- [ ] Run `npm run clips:prepare`; confirm with SQL that every puzzle up to today+90 has a clip and `mp3DurationSeconds` ≈ 9.
- [ ] Commit `feat(audio): pre-cut snippet clips offline`.

### Task 8: Game API routes + proxy (device cookie, CSP nonce, headers)

**Files:** Create `proxy.ts`, `lib/viewer.ts`, `app/api/puzzle/[date]/clip/route.ts`. Modify `app/api/puzzle/[date]/route.ts`, `.../guess/route.ts`, `app/api/archive/route.ts`, `app/api/stats/route.ts`, `app/api/cron/ensure-puzzles/route.ts`. Delete `app/api/audio/[date]/route.ts`, `app/api/puzzle/[date]/extend/route.ts`, `app/api/puzzle/today/route.ts`.

**Produces:** `getViewer(): Promise<Viewer>` (React `cache`d per request; reads device cookie, Better Auth session, plan); route responses per spec §3.5.
- [ ] `proxy.ts`: issue `gts_device` if missing/invalid (1-year, httpOnly, Secure in prod, SameSite=Lax) on both the response and the forwarded request cookies; nonce CSP for page requests (AdSense, `accounts.google.com` allowlisted); security headers; optimistic redirect of `/account`, `/admin` to `/sign-in` when no session cookie.
- [ ] Curl checks: no-cookie request gets `Set-Cookie: gts_device`; guess with `Origin: https://evil.test` → 403; 31st guess in a minute → 429; clip size grows with guess count; answer absent until completion.
- [ ] Commit `feat(api): viewer-scoped game routes, proxy with device cookie and CSP`.

### Task 9: Better Auth, sign-in, merge, admin bootstrap

**Files:** Create `lib/auth.ts`, `lib/auth-client.ts`, `lib/email.ts`, `app/api/auth/[...all]/route.ts`, `app/auth/complete/route.ts`, `app/sign-in/page.tsx`, `components/auth/SignInForm.tsx`, `components/auth/UserMenu.tsx`.

- [ ] `betterAuth({ database: drizzleAdapter(db, { provider: "pg", schema }), socialProviders: { google }, account: { accountLinking: { enabled: true, trustedProviders: ["google"] } }, plugins: [magicLink({ sendMagicLink, storeToken: "hashed", expiresIn: 600 }), admin(), nextCookies()], rateLimit: { enabled: true, storage: "database" }, databaseHooks: { user: { create: { after: bootstrapAdminAndAttach } } } })`. Google provider only registered when its env vars exist.
- [ ] `sendMagicLink` → `lib/email.ts` (Resend; logs the URL in dev when `RESEND_API_KEY` is unset).
- [ ] `/auth/complete`: requires session → `mergeDeviceIntoUser` → `attachPendingEntitlements` → promote to admin when email ∈ `ADMIN_EMAILS` → redirect to a same-origin `next` param (validated to start with `/` and not `//`).
- [ ] Runtime check: magic link from server log signs in; guest attempts appear under the account.
- [ ] Commit `feat(auth): Better Auth with Google + magic link, guest merge`.

### Task 10: Entitlements, BMC webhook, linked emails, account & premium pages

**Files:** Create `lib/services/entitlements.ts`, `lib/services/linked-emails.ts`, `lib/services/audit.ts`, `app/api/webhooks/bmc/route.ts`, `app/account/page.tsx`, `app/account/actions.ts`, `app/account/verify-email/route.ts`, `app/premium/page.tsx`, `scripts/send-test-webhook.ts`.

**Produces:** `getPlan(userId: string | null): Promise<Plan>`, `applyBmcEvent(e: BmcMembershipEvent): Promise<void>`, `attachPendingEntitlements(userId: string): Promise<number>`, `grantPremium(actorId, userId, days)`, `revokePremium(actorId, userId)`, `requestLinkedEmail(userId, email)`, `verifyLinkedEmail(token)`, `writeAudit(actorId, action, target, metadata)`.
- [ ] Webhook: read raw text → verify signature (401) → insert `webhook_events` `ON CONFLICT DO NOTHING` (duplicate → 200 no-op) → parse → apply → mark processed; errors recorded, respond 500 so BMC retries.
- [ ] Linked email: server action (auth required, rate-limited 5/hour) creates token (32 random bytes, store sha256, 30-min expiry) and emails a verify link; verify route consumes the token once, sets `verified_at`, attaches pending entitlements.
- [ ] `scripts/send-test-webhook.ts <email>` signs a sample `membership.started` → user becomes Premium; re-send is a no-op; `membership.cancelled` with past period end → back to Free.
- [ ] Commit `feat(billing): BMC memberships, verified linked emails, premium page`.

### Task 11: Admin console

**Files:** Create `app/admin/page.tsx`, `app/admin/actions.ts`, `components/admin/*`.
- [ ] Every action begins `const viewer = await requireCapability("admin:access")`; actions: search users by email, grant Premium N days, revoke, set role, toggle song `active`; recent `webhook_events` and `audit_log` tables. All mutations audited.
- [ ] Commit `feat(admin): audited admin console`.

### Task 12: Visual system + 3D equalizer stage

**Files:** Modify `app/globals.css`, `app/layout.tsx`. Create `components/stage/StageBackground.tsx`, `components/stage/EqualizerField.tsx`, `components/stage/audio-reactive.ts`, `components/ui/tilt-card.tsx`. Delete `components/theme/ThemeToggle.tsx`.

**Produces:** `registerAnalyser(a: AnalyserNode | null): void`, `readLevels(out: Float32Array): boolean` (true while audio is playing), `<StageBackground />`, `<TiltCard>`.
- [ ] Instanced bars (40×24 desktop / 20×12 when width < 768), window `pointermove` → NDC → raycast plane → ripple centre with exponential decay; idle sine "breathing"; audio levels map log-spaced bins to columns; per-instance colour lerp teal → magenta by height; fog; `frameloop="demand"` driven by an `invalidate` loop that stops when `document.hidden`.
- [ ] Fallback when `matchMedia("(prefers-reduced-motion: reduce)")`, no WebGL2, or `hardwareConcurrency <= 2`.
- [ ] Commit `feat(ui): neon theme and hover-reactive 3D equalizer stage`.

### Task 13: Game UI rebuild

**Files:** Rewrite `components/game/GameBoard.tsx`, `AudioPlayer.tsx` (vinyl button + analyser wiring), `GuessInput.tsx`, `ResultShareCard.tsx`, `types.ts`; create `SnippetTimeline.tsx`, `GuessList.tsx`, `HintChips.tsx`, `Countdown.tsx`, `HowToPlayDialog.tsx`; delete `ProgressionBar.tsx`, `ScoreHud.tsx`, `NewGameButton.tsx`. Modify `lib/hooks/useSnippetPlayer.ts` (refetch clip when guess count changes; `MediaElementAudioSourceNode` → analyser → destination). Delete `lib/hooks/useDeviceId.ts`.
- [ ] Browser pass at 375 px and 1280 px: play → skip → wrong → correct; clip length grows; result card shows points, rank progress, share text copies.
- [ ] Commit `feat(ui): rebuilt game board`.

### Task 14: Archive, stats, premium, account, legal pages + ads

**Files:** Rewrite `app/archive/page.tsx`, `app/archive/[date]/page.tsx`, `app/stats/page.tsx`; create `app/privacy/page.tsx`, `app/terms/page.tsx`, `app/ads.txt/route.ts`, `components/ads/AdsenseScript.tsx`; modify `components/ads/AdSlot.tsx` (reserved height, slot ids from env), `components/layout/SiteHeader.tsx`, `SideMenu.tsx`, create `SiteFooter.tsx`.
- [ ] Layout renders `<AdsenseScript nonce=… />` only when `!can(viewer, "ads:none")` and client id set.
- [ ] Archive: locked rows show crown + upsell; `/archive/[date]` for a locked date renders an upgrade panel (server-side check, not client).
- [ ] Stats: standard stats for all; deep stats for Premium; blurred teaser otherwise.
- [ ] Commit `feat: archive/stats/legal pages and tier-aware ads`.

### Task 15: Verification, docs, cleanup

**Files:** Modify `README.md` (remove credentials; new setup incl. Google OAuth, Resend, BMC, AdSense), `DOCUMENTATION.md` (v2 log), `.env.example`.
- [ ] `npm test`, `npx tsc --noEmit`, `npm run lint`, `npm run build` all clean.
- [ ] End-to-end runtime pass from spec §9. Commit `docs: v2 setup and architecture`.
