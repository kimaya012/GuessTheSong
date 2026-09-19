import Link from "next/link";
import { SideMenu } from "./SideMenu";
import { NewGameButton } from "./NewGameButton";
import { ReelMark } from "./ReelMark";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 flex items-center gap-3 border-b border-border bg-card px-4 py-3">
      <div className="flex shrink-0 items-center gap-3">
        <SideMenu />
        <NewGameButton />
      </div>
      <Link
        href="/"
        className="ml-1 flex min-w-0 flex-1 items-center gap-2 whitespace-nowrap text-foreground"
      >
        <ReelMark className="h-5 w-5 shrink-0 text-primary" />
        <span className="truncate font-heading text-lg tracking-tight">
          <span className="font-normal text-muted-foreground">Guess The</span>{" "}
          <span className="font-semibold">BollySong</span>
        </span>
      </Link>
      <div className="ml-auto flex shrink-0 items-center gap-1">
        <ThemeToggle />
      </div>
    </header>
  );
}
