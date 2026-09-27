"use client";

import { useEffect, useState } from "react";
import { msUntilNextPuzzle } from "@/lib/date";

function format(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

export function Countdown({ timezone }: { timezone: string }) {
  const [ms, setMs] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setMs(msUntilNextPuzzle(timezone));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [timezone]);

  return (
    <p className="text-sm text-muted-foreground">
      Next song in <span className="font-semibold tabular-nums text-foreground">{ms === null ? "…" : format(ms)}</span>
    </p>
  );
}
