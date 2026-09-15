import Link from "next/link";
import { GameBoard } from "@/components/game/GameBoard";

export default async function ArchivePuzzlePage({
  params,
}: {
  params: Promise<{ date: string }>;
}) {
  const { date } = await params;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Archive — {date}</h1>
        <Link href="/archive" className="text-sm text-muted-foreground hover:text-foreground">
          Back to archive
        </Link>
      </header>
      <GameBoard
        date={date}
        puzzleEndpoint={`/api/puzzle/${date}`}
        audioEndpoint={`/api/audio/${date}`}
      />
    </main>
  );
}
