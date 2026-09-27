import type { Metadata } from "next";
import Link from "next/link";
import { Crown, Lock } from "lucide-react";
import { getViewer } from "@/lib/viewer";
import { can } from "@/lib/authz/policy";
import { getAttemptSummaries } from "@/lib/services/stats";
import { deriveDeepStats, deriveStats, type StatBucket } from "@/lib/game/stats";
import { RANKS } from "@/lib/game/ranks";
import { AdSlot } from "@/components/ads/AdSlot";

export const metadata: Metadata = { title: "Your stats" };

function Buckets({ title, buckets }: { title: string; buckets: StatBucket[] }) {
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      {buckets.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Finish a few games to see this.</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {buckets.slice(0, 6).map((b) => (
            <li key={b.label} className="grid grid-cols-[6rem_1fr_3rem] items-center gap-3 text-sm">
              <span className="truncate text-muted-foreground">{b.label}</span>
              <span className="h-2.5 overflow-hidden rounded-full bg-white/8">
                <span className="block h-full rounded-full bg-peacock" style={{ width: `${b.winPercentage}%` }} />
              </span>
              <span className="text-right tabular-nums">{b.winPercentage}%</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function StatsPage() {
  const viewer = await getViewer();
  const attempts = await getAttemptSummaries(viewer);
  const stats = deriveStats(attempts);
  const deep = can(viewer, "stats:deep") ? deriveDeepStats(attempts) : null;
  const maxBar = Math.max(1, ...stats.distribution);
  const rankIndex = RANKS.indexOf(stats.rank.current);

  const tiles = [
    { label: "Played", value: stats.played },
    { label: "Win %", value: stats.winPercentage },
    { label: "Current streak", value: stats.currentStreak },
    { label: "Best streak", value: stats.maxStreak },
    { label: "Total points", value: stats.totalPoints },
    { label: "Average points", value: stats.averagePoints },
  ];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="font-display text-5xl">Your stats</h1>
      {!viewer.userId && (
        <p className="mt-3 text-muted-foreground">
          These are saved on this device only.{" "}
          <Link href="/sign-in?next=/stats" className="font-semibold text-peacock underline">
            Sign in
          </Link>{" "}
          to keep them on every device.
        </p>
      )}

      <section className="panel mt-8 rounded-3xl p-6">
        <p className="text-sm text-muted-foreground">Your rank</p>
        <p className="mt-1 font-display text-4xl text-marigold">{stats.rank.current.name}</p>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/8">
          <div
            className="h-full rounded-full bg-gradient-to-r from-rani to-marigold"
            style={{
              width: stats.rank.next
                ? `${((stats.won - stats.rank.current.minWins) / (stats.rank.next.minWins - stats.rank.current.minWins)) * 100}%`
                : "100%",
            }}
          />
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          {stats.rank.next
            ? `${stats.rank.winsToNext} more ${stats.rank.winsToNext === 1 ? "win" : "wins"} to ${stats.rank.next.name}. Rank ${rankIndex + 1} of ${RANKS.length}.`
            : "You've reached the top rank."}
        </p>
      </section>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {tiles.map((t) => (
          <div key={t.label} className="panel rounded-2xl p-5">
            <p className="font-display text-4xl leading-none">{t.value}</p>
            <p className="mt-2 text-sm text-muted-foreground">{t.label}</p>
          </div>
        ))}
      </section>

      <section className="panel mt-6 rounded-3xl p-6">
        <h2 className="text-lg font-semibold">Guess distribution</h2>
        <ul className="mt-4 grid gap-2">
          {stats.distribution.map((count, i) => (
            <li key={i} className="grid grid-cols-[3.5rem_1fr] items-center gap-3 text-sm">
              <span className="text-muted-foreground">{i < 6 ? `Guess ${i + 1}` : "Missed"}</span>
              <span className="flex items-center">
                <span
                  className={`flex h-7 min-w-8 items-center justify-end rounded-md px-2 font-bold tabular-nums ${i < 6 ? "bg-mint/80 text-night" : "bg-rani/70"}`}
                  style={{ width: `${(count / maxBar) * 100}%` }}
                >
                  {count}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="panel relative mt-6 overflow-hidden rounded-3xl p-6">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Crown className="h-5 w-5 text-marigold" /> Deep stats
        </h2>
        {deep ? (
          <div className="mt-5 grid gap-8 sm:grid-cols-2">
            <Buckets title="Win rate by decade" buckets={deep.byDecade} />
            <Buckets title="Win rate by mood" buckets={deep.byGenre} />
            <p className="text-sm text-muted-foreground sm:col-span-2">
              Median time to solve:{" "}
              <span className="font-semibold text-foreground">
                {deep.medianSolveSeconds === null ? "no wins yet" : `${deep.medianSolveSeconds}s`}
              </span>
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <div aria-hidden="true" className="grid gap-2 blur-sm">
              {[70, 45, 85, 30].map((w) => (
                <span key={w} className="h-3 rounded-full bg-peacock/40" style={{ width: `${w}%` }} />
              ))}
            </div>
            <p className="mt-5 flex items-center gap-2 text-muted-foreground">
              <Lock className="h-4 w-4" /> See which decades and moods you know best with Premium.
            </p>
            <Link href="/premium" className="mt-4 inline-flex rounded-full bg-marigold px-5 py-2.5 font-bold text-primary-foreground">
              See Premium
            </Link>
          </div>
        )}
      </section>

      <AdSlot placement="stats" className="mt-8" />
    </main>
  );
}
