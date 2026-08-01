import { cn } from "@/lib/utils";
import { humanize } from "@/lib/utils";
import { TONE_CLASSES, TONE_DOT, toneFor, type Tone } from "@/lib/status";

interface StatusBadgeProps {
  status: string | null | undefined;
  /** Override the automatic tone lookup. */
  tone?: Tone;
  label?: string;
  dot?: boolean;
  className?: string;
}

/** Traffic-light status pill used in every table and card. */
export function StatusBadge({
  status,
  tone,
  label,
  dot = true,
  className,
}: StatusBadgeProps) {
  const resolved = tone ?? toneFor(status);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium",
        TONE_CLASSES[resolved],
        className,
      )}
    >
      {dot && (
        <span
          aria-hidden
          className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[resolved])}
        />
      )}
      {label ?? humanize(status)}
    </span>
  );
}
