import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
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
  // Every past puzzle is open to everyone; tomorrow's is never served.
  if (puzzleAccess(date, today) === "future") notFound();

  const viewer = await getViewer();
  const { PUZZLE_TIMEZONE, BETTER_AUTH_URL } = env();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-4 sm:py-6">
      <Link href="/archive" className="text-sm font-semibold text-peacock hover:underline">
        Back to the archive
      </Link>
      <div className="mt-2">
        <GameBoard
          date={date}
          isToday={false}
          timezone={PUZZLE_TIMEZONE}
          shareUrl={`${BETTER_AUTH_URL}/archive/${date}`}
          premium={can(viewer, "badge:premium")}
          signedIn={!!viewer.userId}
        />
      </div>
    </main>
  );
}
