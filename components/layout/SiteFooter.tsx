import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-white/5 bg-night/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>A new Bollywood song every day at midnight IST.</p>
        <nav aria-label="Legal" className="flex gap-5">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          <Link href="/premium" className="hover:text-foreground">Go ad-free</Link>
        </nav>
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-8 text-xs text-muted-foreground/70">
        Audio previews are streamed from their licensed sources and belong to their rights holders.
      </p>
    </footer>
  );
}
