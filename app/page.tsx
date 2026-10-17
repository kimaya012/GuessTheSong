import { GameBoard } from "@/components/game/GameBoard";
import { getViewer } from "@/lib/viewer";
import { can } from "@/lib/authz/policy";
import { env } from "@/lib/env";

export default async function Home() {
  const viewer = await getViewer();
  const { PUZZLE_TIMEZONE, BETTER_AUTH_URL } = env();

  return (
    <main className="mx-auto grid w-full max-w-5xl flex-1 grid-cols-1 items-start gap-4 px-4 py-4 sm:gap-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,560px)] lg:gap-10 lg:py-6">
      <section className="lg:sticky lg:top-28">
        {/* On phones the headline stays in the page for screen readers and
            search, but is visually hidden so the game starts under the header. */}
        <h1 className="sr-only font-display text-5xl leading-[0.95] sm:not-sr-only sm:text-5xl lg:text-7xl">
          Name the song from a split second.
        </h1>
        <p className="mt-5 hidden max-w-md text-lg leading-relaxed text-foreground/80 sm:block [text-shadow:0_1px_14px_rgb(11_7_22/0.95)]">
          One Bollywood song a day. You hear 0.4 seconds, then a little more with every miss. Six tries to get it.
        </p>
        <p className="mt-6 hidden max-w-md text-sm text-muted-foreground/80 lg:block">
          Move your cursor over the stage behind this page, then press play and watch it dance.
        </p>
      </section>
      <GameBoard
        date="today"
        isToday
        timezone={PUZZLE_TIMEZONE}
        shareUrl={BETTER_AUTH_URL}
        premium={can(viewer, "badge:premium")}
        signedIn={!!viewer.userId}
      />
    </main>
  );
}
