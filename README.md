# GuessTheBollySong

A daily Bollywood song guessing game (Heardle-style): guess the song from a short audio clip
in 6 tries. Each skip lengthens the clip and reveals one more hint (genre, year, duration,
album, artist). Includes a full archive of past puzzles.

Full architecture/implementation plan: see the project plan doc referenced in this repo's
commit history, or ask Claude Code to summarize `db/schema.ts`, `lib/puzzle-service.ts`, and
the routes under `app/api/`.

## Setup

1. **Database.** Local development uses PostgreSQL running on `localhost:5432`. A dedicated
   role/database were created for this project:
   - role: `gtbs_app` / password: `gtbs_local_dev_pw`
   - database: `guessthebollysong`

   For production, point `DATABASE_URL` at a hosted Postgres instance instead (e.g.
   [Neon](https://neon.tech)) — the app uses the standard `pg`/node-postgres driver, which
   works against local Postgres or any hosted Postgres connection string unchanged.
2. `.env.local` is already set up with the local `DATABASE_URL` and a dev `CRON_SECRET`. Use
   `.env.example` as the template when configuring a production environment.
3. Install dependencies and push the schema:
   ```bash
   npm install
   npm run db:push
   ```
4. Seed the song catalog (resolves each song in `scripts/data/seed-song-list.csv` against the
   Deezer and iTunes preview APIs and inserts it into the `songs` table):
   ```bash
   npm run catalog:ingest
   ```
   Songs that can't be resolved are written to `scripts/data/unresolved-songs.csv` for manual
   follow-up. Grow the catalog over time by adding rows to `seed-song-list.csv` and re-running
   this script.
5. Generate the daily puzzle schedule (picks songs for the next 90 days, avoiding repeats):
   ```bash
   npm run puzzles:generate
   ```
6. Run the dev server:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

## Key scripts

| Script | Purpose |
| --- | --- |
| `npm run catalog:ingest` | Resolve `scripts/data/seed-song-list.csv` against Deezer/iTunes and upsert into `songs` |
| `npm run puzzles:generate` | Top up the `daily_puzzles` schedule (idempotent, deterministic) |
| `npm run db:push` | Push the Drizzle schema to the database (use `db:generate`/`db:migrate` for versioned migrations instead) |
| `npm run db:studio` | Open Drizzle Studio to browse the database |

## Architecture notes

- **Audio**: preview clips come from the Deezer public API (primary) and iTunes Search API
  (fallback) — never Spotify, whose `preview_url` is deprecated for most apps. Clips are
  streamed through `/api/audio/[date]` (date-scoped, not song-id-scoped) so the underlying
  song's identity is never exposed via a client-visible URL.
  **Note:** Deezer's catalog is geo-blocked for requests from India (`data: []` despite a
  nonzero `total` in search results) — if you run `catalog:ingest` from an Indian IP, every
  song will resolve via the iTunes fallback instead, which works fine and is what happened for
  the initial 39-song seed catalog. This isn't a problem for the deployed app itself (Vercel's
  infra isn't India-based), only for local ingestion runs.
- **Anti-cheat**: daily puzzles are generated ahead of time by `scripts/generate-puzzles.ts`,
  not computed live from a client-derivable seed. Guess correctness is always validated
  server-side in `lib/puzzle-service.ts`.
- **Identity**: anonymous, device-id based (a UUID in `localStorage`) — no login required for
  the MVP. See `lib/hooks/useDeviceId.ts`.

## Deploying

Deploy to [Vercel](https://vercel.com/new). Set the same env vars as `.env.example` in the
project settings, and Vercel will pick up the cron job defined in `vercel.json`
(`/api/cron/ensure-puzzles`, daily) automatically.
