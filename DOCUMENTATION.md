# GuessTheBollySong — Build Documentation

A running log of what's been built, the tech stack, and why each decision was made. Kept
up to date as the project progresses; see `README.md` for day-to-day setup/run instructions.

## Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), TypeScript | Full-stack in one app — API routes + frontend, SSR for SEO on archive pages |
| Styling / UI | Tailwind CSS v4 + shadcn/ui | Copy-in components (not a locked dependency), fast to theme |
| Database | PostgreSQL (local for dev; any standard Postgres, e.g. Neon, for prod) | Needs real concurrent writes, `jsonb`, arrays — outgrows SQLite quickly |
| ORM | Drizzle ORM (`drizzle-orm` + `drizzle-kit`) | Lightweight, SQL-shaped, good migration/push tooling |
| DB driver | `pg` (node-postgres) via `drizzle-orm/node-postgres` | Works unchanged against local Postgres and hosted Postgres connection strings alike — no driver swap needed between dev and prod |
| Fuzzy search | Fuse.js | Client-side fuzzy match for the guess-title autocomplete (catalog is small, ~50–500 songs) |
| Audio | Native `<audio>` element + a custom React hook | Simpler than Web Audio API; ±50ms snippet-stop accuracy is more than enough for this game |
| Validation | Zod | Request body validation on API routes |
| Song data sources | Deezer public API (primary), iTunes Search API (fallback) | No-auth, free preview clips. **Not Spotify** — its `preview_url` was deprecated for most apps in Nov 2024 |
| Dev tooling | `tsx` (run TS scripts directly), `dotenv` | Run ingestion/puzzle-generation scripts without a build step |
| Hosting (planned) | Vercel | Native Next.js support, built-in cron for the daily puzzle job |

## Step-by-step build log

### 1. Planning
Wrote a full implementation plan covering data model, anti-cheat design, audio sourcing risk
(Spotify preview deprecation), monetization, and a 4-phase build order. Saved for reference —
ask to see it if needed.

### 2. Scaffolding
- `npx create-next-app@latest` (TypeScript, Tailwind, App Router, ESLint) — scaffolded into a
  temp directory first because `create-next-app` rejects uppercase project names, then copied
  into `C:\GuessTheBollySong` and renamed the `package.json` name to `guessthebollysong`.
- `npx shadcn@latest init` + `add` for `button`, `input`, `dialog`, `progress`, `card`,
  `badge`, `skeleton`, `command`.
- Installed `drizzle-orm`, `fuse.js`, `zod`, `dotenv` (runtime) and `drizzle-kit`, `tsx`
  (dev). Initially installed `@neondatabase/serverless` for the DB driver — later replaced
  (see step 5).

### 3. Data model
`db/schema.ts` — six tables: `songs`, `daily_puzzles`, `user_devices`, `attempts`,
`user_stats`, `users` (stub for a future optional-account layer). Key design choices:
- `daily_puzzles` maps a calendar date to a song, generated **ahead of time** by a script —
  never computed live from a request, so a technically curious user can't derive future
  answers.
- `attempts.guesses` is a `jsonb` array logging every guess/skip per device+puzzle.
- `user_stats` is denormalized (streak, win rate, guess distribution) for fast reads.

### 4. Catalog ingestion & puzzle generation
- `scripts/data/seed-song-list.csv` — a curated starter list of 51 well-known Bollywood songs
  spanning the 1960s–2020s and multiple genres (romantic, item numbers, qawwali, patriotic,
  etc.), with the title/artist plus fallback hint fields (album/year/genre) in case the API
  match is missing metadata.
- `scripts/ingest-catalog.ts` — for each seed row: searches Deezer first, falls back to
  iTunes Search if Deezer has no match or an unreachable preview URL, verifies the resolved
  preview URL actually responds with audio content (`HEAD` request) before inserting, and
  writes anything unresolved to `scripts/data/unresolved-songs.csv` for manual follow-up.
- `scripts/generate-puzzles.ts` — deterministic (seeded) shuffle of the active song pool,
  idempotent (re-running only fills in missing future dates, never touches existing ones),
  avoids reusing a song within a configurable no-repeat window.

### 5. Switched from Neon to local PostgreSQL for development
Originally planned around Neon's serverless HTTP driver. Since local Postgres 16 was already
installed and running on this machine, switched dev (and the default driver choice generally)
to it:
- Created a dedicated `gtbs_app` Postgres role and a `guessthebollysong` database (not using
  the `postgres` superuser directly for the app).
- Replaced `@neondatabase/serverless` with `pg` + `drizzle-orm/node-postgres` in `lib/db.ts` —
  this driver talks standard Postgres wire protocol, so it works identically against local
  Postgres now and a hosted Postgres connection string (Neon or otherwise) at deploy time,
  with zero code changes.
- `.env.local` holds the local connection string (gitignored); `.env.example` documents the
  shape for both local and hosted setups.
- `drizzle.config.ts` and the two scripts load `.env.local` explicitly (via a shared
  `scripts/load-env.ts`) since `tsx`-run scripts don't get Next.js's automatic env loading.

**Finding during ingestion:** Deezer's public API is geo-blocked for requests originating in
India — `/search` returns a nonzero `total` but an empty `data` array, and `/infos` reports
`"open": false` for `country_iso: "IN"`. All 39 successfully-ingested seed songs resolved via
the iTunes fallback instead when ingestion was run from here. This doesn't affect the
deployed app (Vercel's infra isn't India-based), only local ingestion runs.

### 6. Application code
- **API routes** (`app/api/...`): today's/archived puzzle shells (never leak the answer
  pre-completion), server-side-validated guess submission, a **date-scoped** audio proxy
  (`/api/audio/[date]`, not song-id-scoped, so the underlying track identity never appears in
  a client-visible URL), catalog listing (id/title/artist/album/year only), paginated
  archive listing (excludes today/future), device-scoped stats, and a cron safety-net route
  that checks the puzzle horizon and flags dead preview links.
- **Game UI** (`components/game/...`): `GameBoard` (orchestrates load/guess/skip state),
  `AudioPlayer` (snippet playback via `lib/hooks/useSnippetPlayer.ts`), `GuessInput`
  (Fuse.js autocomplete), `HintsPanel` (progressive metadata reveal — genre → year →
  duration → album → artist), `AttemptHistory` (6-box row), `ResultShareCard` (Wordle-style
  emoji-grid share text + clipboard copy).
- **Pages**: `/` (today's game), `/archive` (list of past puzzles), `/archive/[date]` (play a
  specific past puzzle), `/stats` (personal stats from the anonymous device id).
- **Identity**: anonymous `localStorage`-based device UUID (`lib/hooks/useDeviceId.ts`) — no
  login required for MVP, matches the Wordle/Heardle UX.
- **Ads**: a togglable `AdSlot` component that renders nothing until
  `NEXT_PUBLIC_ADSENSE_CLIENT_ID` is set, placed only outside the active game board (below
  the result card, between archive list items) to protect completion/share rates.

### 7. Verification performed
- `npx tsc --noEmit` — clean.
- `npm run lint` (ESLint incl. `react-hooks` rules) — clean; fixed two
  `set-state-in-effect` warnings and replaced `any` types in the ingestion script with proper
  Deezer/iTunes response interfaces along the way.
- `npm run build` — production build succeeds; confirmed `/api/catalog` needed
  `export const dynamic = "force-dynamic"` (it was being statically generated at build time,
  which requires a live DB connection during `next build`).
- Pushed the schema to the local DB (`npm run db:push`), ran `catalog:ingest` (39/51 songs
  resolved) and `puzzles:generate` (90 days scheduled from 2026-09-15).
- Ran the dev server and hit the real endpoints end-to-end:
  - `/api/puzzle/today` never includes the answer before completion.
  - `/api/audio/today` streams a real, playable ~1.1MB audio clip with correct
    `Content-Type` and no upstream URL exposed to the client.
  - `/api/puzzle/today/guess` correctly advances the snippet duration and unlocks the next
    metadata hint on each attempt.
  - `/api/puzzle/2026-12-31` (a future date) returns `404`.
  - `/api/archive` correctly excludes today and future dates.
  - `/api/stats` stays at all-zero until a puzzle is actually completed.

### 8. Browser play-testing found and fixed two real audio bugs
Loaded the app in an actual Chrome tab and found the play button stuck in a permanent
loading state. Root cause, found via a mix of `curl` header inspection and in-page JS
diagnostics:
- The original `/api/audio/[date]` proxy piped the upstream response straight through
  without handling `Range` requests or setting `Content-Length` — `<audio>` elements send a
  `Range: bytes=0-` request on load and stall indefinitely if the response comes back `200`
  instead of a proper `206 Partial Content` with a known length. **Fix:** buffer the (small,
  ~1MB) preview clip server-side and serve real `206`/`Content-Length`/`Accept-Ranges`
  responses, with an in-memory cache keyed by the upstream URL.
- Separately, iTunes' CDN mislabels plain (non-DRM) AAC preview clips as
  `audio/x-m4p` — the MIME type for FairPlay-*protected* purchases — which browsers refuse
  to decode even though the bytes are ordinary playable M4A/AAC-LC audio (confirmed via
  `file`/`xxd` on the downloaded bytes). **Fix:** normalize the content-type to `audio/mp4`
  before serving it.
- Additionally rewrote `useSnippetPlayer` to fetch the clip as a `Blob` and play it from an
  `URL.createObjectURL()` reference rather than pointing `<audio src>` directly at the
  network endpoint — more robust in general (no reliance on the browser's native range/
  streaming negotiation for a file this small) and it's what made the play button reliably
  flip from a loading spinner to ready in the browser.
- Verified end-to-end in Chrome: catalog/puzzle data loads, the play button reaches the
  ready state, and clicking it returns the UI to a clean idle state consistent with the 1s
  snippet having played and auto-stopped as designed.

## Next steps

1. ~~Play-test in a real browser~~ — done; found and fixed the audio-loading bugs above.
   Still worth a manual pass yourself: click through a full game (play/skip/guess/win/lose),
   check archive/stats pages, and confirm mobile responsiveness — some interaction testing
   in the automated browser session was inconclusive (the debugger connection occasionally
   stalled during real audio decode, which looks like a quirk of the automation tooling
   itself rather than the app, but hasn't been independently confirmed in a normal browser).
2. **Grow the catalog** — add more rows to `scripts/data/seed-song-list.csv` (target
   200–500 songs across eras/genres per the original plan) and re-run
   `npm run catalog:ingest`; review `scripts/data/unresolved-songs.csv` for songs that need a
   manual title/artist tweak to resolve.
3. **Phase 2 (archive/stats/share polish)** — the routes/pages exist; still needs a pass on
   loading/empty states and visual polish (Phase 2 in the original plan).
3.5. Consider running `catalog:ingest` from a non-India host/proxy at some point to pull in
   Deezer matches too, for cases where iTunes doesn't have a track.
4. **Phase 3 (SEO/ads/OG images)** — sitemap, robots.txt, per-date archive page metadata, an
   OG share-image route, and wiring `AdSlot` to a real AdSense client ID once approved.
5. **Phase 4 (deploy)** — push to GitHub, connect to Vercel, provision a production Postgres
   (Neon recommended), set env vars, run `db:push`/ingestion/puzzle-generation against
   production, and confirm `vercel.json`'s cron job fires correctly.
