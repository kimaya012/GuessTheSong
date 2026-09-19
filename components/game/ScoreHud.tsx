"use client";

import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ScoreHudProps {
  currentScore: number;
  snippetDurationSec: number;
  extendCost: number;
  onExtend: () => void;
  extending: boolean;
  disabled: boolean;
}

export function ScoreHud({
  currentScore,
  snippetDurationSec,
  extendCost,
  onExtend,
  extending,
  disabled,
}: ScoreHudProps) {
  const canExtend = !disabled && !extending && currentScore >= extendCost;

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-2.5">
      <div className="flex items-center gap-4 text-sm">
        <span>
          <span className="font-heading text-lg text-foreground">{currentScore.toLocaleString()}</span>{" "}
          <span className="text-muted-foreground">pts</span>
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">{snippetDurationSec}s snippet</span>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={onExtend}
        disabled={!canExtend}
        className="gap-1"
        title={
          disabled
            ? "Puzzle finished"
            : `Add ${1}s to the snippet for -${extendCost.toLocaleString()} points`
        }
      >
        {extending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
        1s <span className="text-muted-foreground">(-{extendCost.toLocaleString()})</span>
      </Button>
    </div>
  );
}
