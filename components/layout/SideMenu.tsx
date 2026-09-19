"use client";

import { useState } from "react";
import Link from "next/link";
import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { Menu, X, Home, Archive, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Today's puzzle", icon: Home },
  { href: "/archive", label: "Archive", icon: Archive },
  { href: "/stats", label: "Stats", icon: BarChart3 },
];

export function SideMenu() {
  const [open, setOpen] = useState(false);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <DialogPrimitive.Trigger
        render={
          <Button variant="ghost" size="icon" aria-label="Open menu" className="shrink-0" />
        }
      >
        <Menu className="h-5 w-5" />
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/30 duration-150 data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0" />
        <DialogPrimitive.Popup
          className={cn(
            "fixed inset-y-0 left-0 z-50 flex h-full w-64 flex-col gap-1 border-r border-border bg-card p-4 text-card-foreground outline-none",
            "transition-transform duration-200 data-open:translate-x-0 data-closed:-translate-x-full",
          )}
        >
          <div className="mb-4 flex items-center justify-between">
            <span className="font-heading text-lg text-foreground">Menu</span>
            <DialogPrimitive.Close
              render={<Button variant="ghost" size="icon-sm" aria-label="Close menu" />}
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>
          {LINKS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-primary/10 hover:text-primary"
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
