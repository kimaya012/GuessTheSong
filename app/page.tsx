import Link from "next/link";
import { GameBoard } from "@/components/game/GameBoard";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">GuessTheBollySong</h1>
        <nav className="flex gap-4 text-sm text-muted-foreground">
          <Link href="/archive" className="hover:text-foreground">
            Archive
          </Link>
          <Link href="/stats" className="hover:text-foreground">
            Stats
          </Link>
        </nav>
      </header>
      <p className="text-sm text-muted-foreground">
        Guess the Bollywood song from a short clip — you get 6 tries, and each skip reveals
        more of the song and a new hint.
      </p>
      <GameBoard date="today" puzzleEndpoint="/api/puzzle/today" audioEndpoint="/api/audio/today" />
    </main>
  );
}
