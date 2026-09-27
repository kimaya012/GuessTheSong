"use client";

import { Dialog as DialogPrimitive } from "@base-ui/react/dialog";
import { CircleHelp, X } from "lucide-react";

const STEPS = [
  "Press the record to hear the first 0.4 seconds of today's song.",
  "Search for the title and pick it from the list. Stuck? Skip to hear more.",
  "Every skip or wrong guess unlocks a longer clip (1s, 2s, 5s, 7s, 9s) and one more hint.",
  "Get it in six tries. A first-guess win is worth 6 points, a sixth-guess win 1 point.",
];

export function HowToPlayDialog() {
  return (
    <DialogPrimitive.Root>
      <DialogPrimitive.Trigger className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-muted-foreground ring-1 ring-white/10 hover:text-foreground">
        <CircleHelp className="h-4 w-4" /> How to play
      </DialogPrimitive.Trigger>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Backdrop className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Popup className="panel fixed left-1/2 top-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 rounded-3xl p-6 outline-none data-open:animate-in data-open:zoom-in-95">
          <div className="mb-4 flex items-start justify-between gap-4">
            <DialogPrimitive.Title className="font-display text-3xl">How to play</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close" className="rounded-full p-1.5 text-muted-foreground hover:text-foreground">
              <X className="h-5 w-5" />
            </DialogPrimitive.Close>
          </div>
          <ol className="grid gap-3">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-foreground/90">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-marigold/15 text-xs font-bold text-marigold">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <p className="mt-5 text-sm text-muted-foreground">A new song goes live every day at midnight, India time.</p>
        </DialogPrimitive.Popup>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
