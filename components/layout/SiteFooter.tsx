import Link from "next/link";
import { env } from "@/lib/env";

export function SiteFooter() {
  const contact = env().NEXT_PUBLIC_CONTACT_EMAIL;

  return (
    <footer className="mt-16 border-t border-white/5 bg-night/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <p>A new Bollywood song every day at midnight IST.</p>
        <nav aria-label="Legal" className="flex gap-5">
          <Link href="/privacy" className="hover:text-foreground">Privacy</Link>
          <Link href="/terms" className="hover:text-foreground">Terms</Link>
          {contact && (
            <a href={`mailto:${contact}`} className="hover:text-foreground">
              Contact
            </a>
          )}
        </nav>
      </div>
      <p className="mx-auto max-w-5xl px-4 pb-8 text-xs text-muted-foreground/70">
        Audio previews are streamed from their licensed sources and belong to their rights holders.
        {contact ? " Rights holders can write to us through the contact link." : ""}
      </p>
    </footer>
  );
}
