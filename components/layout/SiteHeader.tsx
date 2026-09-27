import Link from "next/link";
import { Crown } from "lucide-react";
import { getViewer } from "@/lib/viewer";
import { can } from "@/lib/authz/policy";
import { SideMenu } from "./SideMenu";
import { ReelMark } from "./ReelMark";
import { NAV_LINKS } from "./nav-links";
import { UserMenu } from "@/components/auth/UserMenu";

export async function SiteHeader() {
  const viewer = await getViewer();
  const signedIn = !!viewer.userId;
  const isAdmin = can(viewer, "admin:access");
  const premium = can(viewer, "badge:premium");

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-night/60 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
        <SideMenu signedIn={signedIn} isAdmin={isAdmin} />
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="GuessTheBollySong home">
          <ReelMark className="h-6 w-6 shrink-0 text-marigold sm:h-7 sm:w-7" />
          <span className="truncate font-display text-[17px] leading-none sm:text-2xl">
            Guess<span className="text-marigold">The</span>BollySong
          </span>
        </Link>

        <nav aria-label="Main" className="ml-auto hidden items-center gap-1 md:flex">
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:bg-white/5 hover:text-foreground"
            >
              {label}
            </Link>
          ))}
          {isAdmin && (
            <Link href="/admin" className="rounded-full px-3.5 py-2 text-sm font-semibold text-peacock hover:bg-white/5">
              Admin
            </Link>
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-2">
          {premium && (
            <span title="Premium listener" className="hidden items-center gap-1 rounded-full bg-marigold/15 px-2.5 py-1 text-xs font-bold text-marigold sm:inline-flex">
              <Crown className="h-3.5 w-3.5" /> Premium
            </span>
          )}
          {signedIn ? (
            <UserMenu name={viewer.name || viewer.email || "Listener"} />
          ) : (
            <Link
              href="/sign-in"
              className="rounded-full bg-marigold px-4 py-2 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-px"
            >
              Sign in
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
