import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { TONE_CLASSES, TONE_DOT, type Tone } from "@/lib/status";
import { Progress } from "@/components/ui/progress";

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  hint?: string;
  tone?: Tone;
  icon?: LucideIcon;
  /** Renders a progress bar under the value. */
  progress?: number;
  /** Planned value marker on the progress bar. */
  target?: number;
  href?: string;
  className?: string;
}

export function KpiCard({
  label,
  value,
  unit,
  hint,
  tone = "info",
  icon: Icon,
  progress,
  target,
  href,
  className,
}: KpiCardProps) {
  const body = (
    <div
      className={cn(
        "group flex h-full flex-col justify-between rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow",
        href && "hover:border-primary/40 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        {Icon ? (
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-md border",
              TONE_CLASSES[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
        ) : (
          <span
            aria-hidden
            className={cn("mt-1 h-2 w-2 rounded-full", TONE_DOT[tone])}
          />
        )}
      </div>

      <div className="mt-3">
        <p className="flex items-baseline gap-1">
          <span className="text-2xl font-semibold tabular-nums tracking-tight">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-muted-foreground">
              {unit}
            </span>
          )}
        </p>
        {progress !== undefined && (
          <Progress
            value={progress}
            target={target}
            tone={tone}
            size="sm"
            className="mt-2"
          />
        )}
        {hint && (
          <p className="mt-1.5 text-xs leading-snug text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full focus-visible:rounded-lg">
      {body}
    </Link>
  ) : (
    body
  );
}

/** Small counter tile used by the document / equipment status strips. */
export function CounterTile({
  label,
  value,
  tone = "neutral",
  href,
}: {
  label: string;
  value: number | string;
  tone?: Tone;
  href?: string;
}) {
  const content = (
    <div
      className={cn(
        "rounded-lg border px-3 py-2.5 transition-colors",
        TONE_CLASSES[tone],
        href && "hover:brightness-105",
      )}
    >
      <p className="text-xl font-semibold tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-xs font-medium leading-tight opacity-90">{label}</p>
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}
