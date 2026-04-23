"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type AnalysisProgressProps = {
  /** Short label for the current stage (single LLM call → one stage). */
  stageLabel?: string;
  className?: string;
};

/**
 * Single progress bar (0–100%) + stage label for background analysis.
 * Mount only while the job is running; parent should use `key` to reset between runs.
 * Percent advances on a timer (wall-clock estimate, not token-accurate).
 */
export function AnalysisProgress({
  stageLabel = "Model",
  className,
}: AnalysisProgressProps) {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      setPct(Math.min(92, 4 + (elapsed / 10_000) * 88));
    };
    const id = window.setInterval(tick, 200);
    const t0 = window.setTimeout(tick, 0);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(t0);
    };
  }, []);

  const rounded = Math.round(pct);

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Badge variant="muted" className="font-normal">
          {stageLabel}
        </Badge>
        <span className="text-sm tabular-nums text-muted-foreground">
          {rounded}%
        </span>
      </div>
      <div
        className="h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={rounded}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Analysis progress, ${stageLabel}`}
      >
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
