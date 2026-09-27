# GuessTheBollySong

A daily Bollywood song guessing game. Hear 0.4 seconds of a song, then 1s, 2s, 5s, 7s and 9s with
each miss, plus one new hint per miss. Six tries. A first-guess win is worth 6 points, a sixth-guess
win 1 point (the same scoring as guesstheaudio.com).

- **Free**: today's song, the last 7 days of the archive, stats (on this device, or on every device once signed in).
- **Premium** (Buy Me a Coffee membership): the full archive, no ads, deep stats, a crown on share cards.

Architecture and decisions: [`docs/superpowers/specs/2026-09-27-premium-redesign-design.md`](docs/superpowers/specs/2026-09-27-premium-redesign-design.md).
Build log: [`DOCUMENTATION.md`](DOCUMENTATION.md).

## Local setup

1. **Database.** Create a least-privilege role and database (as the `postgres` superuser):
   ```sql
   CREATE ROLE gtbs_app LOGIN PASSWORD '<generate one>';
   CREATE DATABASE guessthebollysong OWNER gtbs_app;
   ```
2. **Environment.** Copy `.env.example` to `.env.local` and fill in `DATABASE_URL`, `BETTER_AUTH_SECRET`,
   `DEVICE_COOKIE_SECRET` and `ADMIN_EMAILS`. Everything else is optional locally: without
   `RESEND_API_KEY`, sign-in links are printed in the dev-server console.
3. **Install and migrate.**
   ```bash
   npm install
   npm run db:migrate
   ```
4. **Songs and puzzles.**
   ```bash
   npm run catalog:ingest
   PUZZLE_BACKFILL_DAYS=21 npm run puzzles:generate
   ```
   `catalog:ingest` resolves `scripts/data/seed-song-list.csv` against Deezer and iTunes previews.
   `puzzles:generate` schedules 90 days ahead (and optionally backfills past days on an empty
   schedule), then pre-cuts each puzzle's 9-second snippet with ffmpeg.
5. **Run.** `npm run dev`, then open http://localhost:3000.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm test` | Unit tests (Vitest) for rules, stats, policy, cookies, MP3 slicing, BMC webhooks |
| `npm run db:generate` / `db:migrate` | Create / apply versioned SQL migrations in `drizzle/` |
| `npm run catalog:ingest` | Add songs from the seed CSV |
| `npm run puzzles:generate` | Top up the schedule and cut missing snippet clips |
| `npm run clips:prepare` | Only cut missing snippet clips |
| `npx tsx scripts/send-test-webhook.ts <email>` | Send a signed test BMC membership webhook to the local app |

## Going live

1. Provision Postgres (e.g. Neon) and run `npm run db:migrate` against it.
2. Deploy to Vercel with every variable from `.env.example`. `BETTER_AUTH_URL` must be the public https origin.
3. **Google sign-in**: create an OAuth client with redirect URI `https://<domain>/api/auth/callback/google`.
4. **Email**: verify your domain in Resend and set `EMAIL_FROM` on it.
5. **Buy Me a Coffee**: create a monthly membership, add a webhook to `https://<domain>/api/webhooks/bmc`
   for membership events, copy its secret into `BMC_WEBHOOK_SECRET`, and send a test event. Its
   payload should show `data.supporter_email` and `data.current_period_end` (see `lib/billing/bmc.ts`).
6. **AdSense**: once approved, set the client and slot ids, then configure the consent message in
   AdSense → Privacy & messaging. `/ads.txt` is generated from the client id.
7. Run `puzzles:generate` against production from a machine with ffmpeg access (the npm package bundles it).
   Vercel Cron calls `/api/cron/ensure-puzzles` daily to report a low horizon or missing clips.
