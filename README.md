# GuessTheBollySong

A daily Bollywood song guessing game. Hear 0.4 seconds of a song, then 1s, 2s, 5s, 7s and 9s with
each miss, plus one new hint per miss. Six tries. A first-guess win is worth 6 points, a sixth-guess
win 1 point (the same scoring as guesstheaudio.com).

The game is free for everyone and supported by Google AdSense:

- **Everyone**: today's song and the whole archive, with stats saved on this device.
- **Signed in (free)**: stats that follow you to every device, the decade and vibe breakdown, and the ability to change your public name.
- **Premium** is parked. The code is dormant behind `PREMIUM_ENABLED` (see below).

Architecture and decisions: [`docs/superpowers/specs/2026-09-27-premium-redesign-design.md`](docs/superpowers/specs/2026-09-27-premium-redesign-design.md)
(partly superseded, see the note at its top). Build log: [`DOCUMENTATION.md`](DOCUMENTATION.md).

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
   `catalog:ingest` reads `scripts/data/seed-song-list.csv` plus every Spotify playlist export in
   `scripts/data/exportify/` (made with [exportify.net](https://exportify.net); a file name containing
   "hip hop" or "rap" tags the playlist Hip-Hop), and resolves each song to an iTunes preview. The
   in-game "vibe" hint comes from the export's audio features. Re-running only fetches new songs;
   misses are listed in `scripts/data/unresolved-songs.csv` with the reason.
   `puzzles:generate` schedules 90 days ahead (and optionally backfills past days on an empty
   schedule), then pre-cuts each puzzle's 9-second snippet with ffmpeg.
5. **Run.** `npm run dev`, then open http://localhost:3000.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm test` | Unit tests (Vitest) for rules, stats, policy, cookies, MP3 slicing, matching and the sign-in nudge |
| `npm run db:generate` / `db:migrate` | Create / apply versioned SQL migrations in `drizzle/` |
| `npm run catalog:ingest` | Add songs from the seed CSV and Exportify playlists |
| `npm run puzzles:generate` | Top up the schedule and cut missing snippet clips |
| `npm run clips:prepare` | Only cut missing snippet clips |

## Hosting on free tiers

The site shows AdSense ads, which makes it a **commercial** site. That matters for the free plans:

| Host | Ads on the free tier? |
| --- | --- |
| Vercel Hobby | **No.** Its [fair-use guidelines](https://vercel.com/docs/limits/fair-use-guidelines) restrict Hobby to non-commercial use and name AdSense as commercial. Donation links are fine, ads are not. |
| Netlify free | Commercial use is allowed per [Netlify's announcement](https://netlify.com/blog/introducing-netlify-free-plan), though ads are not mentioned explicitly. Going over the free limits pauses the site for the rest of the month. |
| Cloudflare Pages | Appears to allow it ([third-party comparison](https://agentdeals.dev/cloudflare-pages-vs-vercel)), but Next.js needs an adapter and this app's Node-runtime proxy and `pg` driver may not run unchanged. |

Check each host's current terms before relying on them. A free Postgres such as Neon holds the catalog
and the roughly 140 KB clip per puzzle; a 2,000-song catalog is close to the 0.5 GB free limit.

## Going live

**v1 plan: Vercel (app) + Render (Postgres), no ads yet.** Step-by-step instructions, with the
caveats of Render's free database (it expires after about 30 days, so there is a weekly encrypted
backup and a "move to a new database" procedure): [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md).

Later, when adding ads or custom services:

1. **Domain and host.** AdSense needs a domain you own, and the host's plan must allow ads (see the
   table above). Set `BETTER_AUTH_URL` to the public https origin.
2. **Email sign-in** (optional): verify your domain in Resend, then set `RESEND_API_KEY` and
   `EMAIL_FROM`. Without a key, production sign-in is Google-only and the email form is hidden.
3. **AdSense**: once approved, set the client and slot ids, then configure the consent message in
   AdSense, Privacy & messaging. `/ads.txt` is generated from the client id. Pages made mostly of
   a game with little text are a common reason for rejection, so keep the privacy and terms pages live.
4. **Scheduled jobs.** `.github/workflows/puzzles.yml` tops up the schedule and cuts clips weekly;
   `vercel.json` runs the daily `/api/cron/ensure-puzzles` check on Vercel (on another host, call it
   daily with `Authorization: Bearer $CRON_SECRET`).

## Player names

Players can pick a public name, shown on the stats and account pages and the header avatar (and on the
leaderboard once there is one).

- **Format:** plain letters and numbers (A-Z, a-z, 0-9), 3 to 20 characters, at least one letter. Names
  made only of numbers or only of symbols are refused. Names are unique ignoring case.
- **Who can set one:** anyone may claim a first name. It belongs to their device while they are a guest.
  A guest cannot change it; signing in moves the name onto the account and unlocks one free change. After
  that, a signed-in player must wait 7 days between changes (`NAME_CHANGE_COOLDOWN_DAYS` in
  `lib/names/policy.ts`). If the account already has a name when a guest signs in, the account keeps its
  name and the device name is freed.
- **Suggestions:** `lib/names/generator.ts` builds names like `RangeelaTabla42` from Indian music and
  cinema words. Edit the two word lists freely; the tests run every pairing through the format rules and
  the blocklist.
- **Moderation:** `lib/names/blocklist.ts` is a conservative **starter** list (English and romanised
  Hindi) plus reserved, official-sounding names. It stays short on purpose, because short words wrongly
  reject real names such as Kshitij, Nazia or Randhir. No blocklist is complete, so admins can clear a
  name from `/admin` (the player can then pick again, and the action is audit-logged). Extend the list as
  you see abuse.
- **Abuse limits:** claims are rate-limited per device and per network address.
- **Not built yet:** names claimed by guests whose cookies are lost stay reserved; a periodic cleanup of
  long-inactive guest names and a "report this name" button are good follow-ups.

## Premium (parked)

Nothing in the UI mentions Premium. The `entitlements` table, the `premium` tier in
`lib/authz/policy.ts` and the admin grant/revoke actions are kept so it can return cheaply. They stay
off until `PREMIUM_ENABLED=true`, and a payment path (e.g. an on-site checkout that writes
entitlements) exists. If it returns, give it only **additive** perks (ad-free play, streak freeze,
practice filters, cosmetics), never things free players already have.
