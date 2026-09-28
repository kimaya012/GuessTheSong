"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { NAV_LINKS } from "./nav-links";

// Mobile navigation drawer; the header shows inline links from md up.
export function SideMenu({ signedIn, isAdmin }: { signedIn: boolean; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const links = [
    ...NAV_LINKS,
    signedIn ? { href: "/account", label: "Account" } : { href: "/sign-in", label: "Sign in" },
    ...(isAdmin ? [{ href: "/admin", label: "Admin" }] : []),
  ];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        render={<Button variant="ghost" size="icon" aria-label="Open menu" className="shrink-0 md:hidden" />}
      >
        <Menu className="h-5 w-5" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full w-72 flex-col gap-1 border-r border-border bg-popover p-5 text-popover-foreground outline-none",
            "transition-transform duration-200 data-open:translate-x-0 data-closed:-translate-x-full",
          )}
        >
          <div className="mb-6 flex items-center justify-between">
            <DialogPrimitive.Title className="font-display text-2xl">Menu</DialogPrimitive.Title>
            <DialogPrimitive.Close render={<Button variant="ghost" size="icon-sm" aria-label="Close menu" />}>
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-3 text-base font-semibold transition-colors hover:bg-white/5 hover:text-marigold"
            >
              {label}
            </Link>
          ))}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
