import * as React from "react";

import { cn } from "@/lib/utils";
import { TONE_DOT, type Tone } from "@/lib/status";

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  tone?: Tone;
  /** Draws a marker at the planned position for planned-vs-actual bars. */
  target?: number;
  size?: "sm" | "md";
}

/**
 * Progress bar. Rendered with plain divs rather than the Radix primitive so
 * it can also draw a planned-value marker.
 */
export function Progress({
  value,
  tone = "info",
  target,
  size = "md",
  className,
  ...props
}: ProgressProps) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "relative w-full overflow-hidden rounded-full bg-muted",
        size === "sm" ? "h-1.5" : "h-2.5",
        className,
      )}
      {...props}
    >
      <div
        className={cn("h-full rounded-full transition-all", TONE_DOT[tone])}
        style={{ width: `${clamped}%` }}
      />
      {target !== undefined && (
        <span
          aria-hidden
          title={`Planned ${Math.round(target)}%`}
          className="absolute top-0 h-full w-0.5 bg-foreground/60"
          style={{ left: `${Math.max(0, Math.min(100, target))}%` }}
        />
      )}
    </div>
  );
}
