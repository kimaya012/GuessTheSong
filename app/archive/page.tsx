import type { Metadata } from "next";
import Link from "next/link";
import { Fragment } from "react";
import { Crown } from "lucide-react";
import { getViewer } from "@/lib/viewer";
import { ARCHIVE_FREE_DAYS, can } from "@/lib/authz/policy";
import { todayInTz } from "@/lib/date";
import { countArchive, listArchive, type ArchiveEntry } from "@/lib/services/archive";
import { AdSlot } from "@/components/ads/AdSlot";

export const metadata: Metadata = { title: "Archive" };

const SQUARE = { correct: "bg-mint", wrong: "bg-rani", skip: "bg-white/25", giveup: "bg-white/25" } as const;

function Result({ entry }: { entry: ArchiveEntry }) {
  if (entry.locked) {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-marigold">
        <Crown className="h-4 w-4" /> Premium
      </span>
    );
  }
  if (!entry.status) return <span className="text-sm font-semibold text-peacock">Play</span>;
  return (
    <span className="flex items-center gap-3">
      <span className="flex gap-1" aria-label={`${entry.status}, ${entry.guessKinds.length} guesses`}>
        {Array.from({ length: 6 }, (_, i) => {
          const kind = entry.guessKinds[i];
          return <span key={i} className={`h-3.5 w-3.5 rounded-[4px] ${kind ? SQUARE[kind] : "bg-white/8"}`} />;
        })}
      </span>
      <span className="hidden w-16 text-right text-sm text-muted-foreground sm:inline">
        {entry.status === "won" ? `${entry.points} pts` : entry.status === "lost" ? "Missed" : "In play"}
      </span>
    </span>
  );
}

export default async function ArchivePage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const viewer = await getViewer();
  const page = Math.max(1, Number.parseInt((await searchParams).page ?? "1", 10) || 1);
  const today = todayInTz();
  const [{ entries, hasMore }, total] = await Promise.all([listArchive(viewer, today, page), countArchive(today)]);
  const fullAccess = can(viewer, "archive:full");

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <h1 className="font-display text-5xl">The archive</h1>
      <p className="mt-3 max-w-xl text-muted-foreground">
        Every song we&apos;ve played, newest first. Missed a day? Your streak only counts games you play.
      </p>

      {!fullAccess && (
        <div className="panel mt-6 flex flex-col gap-3 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between">
          <p>
            Free listeners can replay the last {ARCHIVE_FREE_DAYS} days. Premium opens all {total} past songs.
          </p>
          <Link href="/premium" className="shrink-0 rounded-full bg-marigold px-5 py-2.5 text-center font-bold text-primary-foreground">
            Unlock the archive
          </Link>
        </div>
      )}

      {entries.length === 0 ? (
        <p className="panel mt-8 rounded-2xl p-6 text-muted-foreground">
          No past songs yet. Today&apos;s puzzle is the first one, so <Link href="/" className="text-peacock underline">go play it</Link>.
        </p>
      ) : (
        <ul className="panel mt-8 divide-y divide-white/6 overflow-hidden rounded-2xl">
          {entries.map((entry, i) => (
            <Fragment key={entry.puzzleNumber}>
              <li>
                <Link
                  href={entry.locked ? "/premium" : `/archive/${entry.date}`}
                  className="flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-white/4"
                >
                  <span>
                    <span className="font-display text-2xl">#{entry.puzzleNumber}</span>
                    <span className="ml-3 text-sm text-muted-foreground">
                      {new Date(`${entry.date}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}
                    </span>
                  </span>
                  <Result entry={entry} />
                </Link>
              </li>
              {(i + 1) % 8 === 0 && i < entries.length - 1 && (
                <li className="px-5 py-4">
                  <AdSlot placement="archive" />
                </li>
              )}
            </Fragment>
          ))}
        </ul>
      )}

      <nav aria-label="Archive pages" className="mt-6 flex justify-between">
        {page > 1 ? (
          <Link href={`/archive?page=${page - 1}`} className="font-semibold text-peacock hover:underline">
            Newer songs
          </Link>
        ) : (
          <span />
        )}
        {hasMore && (
          <Link href={`/archive?page=${page + 1}`} className="font-semibold text-peacock hover:underline">
            Older songs
          </Link>
        )}
      </nav>
    </main>
  );
}
