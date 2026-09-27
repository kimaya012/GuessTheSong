"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";

// Leans a few degrees toward the pointer (fine pointers only), giving the
// main panel physical depth over the 3D stage. Motion is skipped for users
// who prefer reduced motion.
export function TiltCard({ className, children }: { className?: string; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el || e.pointerType !== "mouse") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.transform = `perspective(1400px) rotateX(${(-y * 3).toFixed(2)}deg) rotateY(${(x * 4).toFixed(2)}deg)`;
    el.style.setProperty("--glow-x", `${((x + 0.5) * 100).toFixed(1)}%`);
    el.style.setProperty("--glow-y", `${((y + 0.5) * 100).toFixed(1)}%`);
  }

  function onPointerLeave() {
    if (ref.current) ref.current.style.transform = "";
  }

  return (
    <div
      ref={ref}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      className={cn(
        "panel relative transition-transform duration-300 ease-out will-change-transform",
        "before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit] before:bg-[radial-gradient(600px_circle_at_var(--glow-x,50%)_var(--glow-y,0%),rgb(255_176_32/0.09),transparent_40%)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
