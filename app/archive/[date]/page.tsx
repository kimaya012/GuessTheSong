import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Crown } from "lucide-react";
import { GameBoard } from "@/components/game/GameBoard";
import { getViewer } from "@/lib/viewer";
import { can, puzzleAccess } from "@/lib/authz/policy";
import { isValidDateString, todayInTz } from "@/lib/date";
import { env } from "@/lib/env";
import { getPuzzleNumberForDate } from "@/lib/services/puzzles";

type Params = { params: Promise<{ date: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { date } = await params;
  if (!isValidDateString(date) || date >= todayInTz()) return { title: "Archive" };
  const n = await getPuzzleNumberForDate(date);
  return { title: n ? `Song #${n}` : "Archive" };
}

export default async function ArchivePuzzlePage({ params }: Params) {
  const { date } = await params;
  const today = todayInTz();
  if (!isValidDateString(date)) notFound();
  if (date === today) redirect("/");

  const viewer = await getViewer();
  const access = puzzleAccess(viewer, date, today);
  if (access === "future") notFound();

  const { PUZZLE_TIMEZONE, BETTER_AUTH_URL } = env();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-10">
      <Link href="/archive" className="text-sm font-semibold text-peacock hover:underline">
        Back to the archive
      </Link>
      <div className="mt-4">
        {access === "premium_required" ? (
          // Decided on the server: the puzzle data is never sent to this viewer.
          <div className="panel rounded-3xl p-8 text-center">
            <Crown className="mx-auto h-10 w-10 text-marigold" />
            <h1 className="mt-4 font-display text-4xl">This one&apos;s in the vault</h1>
            <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
              Songs older than a week are part of the Premium archive, along with ad-free play and deeper stats.
            </p>
            <Link href="/premium" className="mt-6 inline-flex rounded-full bg-marigold px-6 py-3 font-bold text-primary-foreground">
              See Premium
            </Link>
          </div>
        ) : (
          <GameBoard
            date={date}
            isToday={false}
            timezone={PUZZLE_TIMEZONE}
            shareUrl={`${BETTER_AUTH_URL}/archive/${date}`}
            premium={can(viewer, "badge:premium")}
          />
        )}
      </div>
    </main>
  );
}
