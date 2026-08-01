import { cn, formatDate } from "@/lib/utils";
import { toneFor, TONE_DOT } from "@/lib/status";
import { StatusBadge } from "@/components/dashboard/status-badge";

export interface GanttBar {
  id: string;
  name: string;
  plannedStart: string;
  plannedFinish: string;
  actualStart?: string | null;
  actualFinish?: string | null;
  progress: number;
  status: string;
  owner?: string;
}

interface GanttProps {
  bars: GanttBar[];
  /** Overall project window; defaults to the min/max of the bars. */
  windowStart?: string;
  windowEnd?: string;
  /** Vertical "today" marker. */
  today?: string;
}

function ms(date: string) {
  return new Date(date).getTime();
}

function monthTicks(start: number, end: number) {
  const ticks: { label: string; position: number }[] = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  while (cursor.getTime() <= end) {
    const position = ((cursor.getTime() - start) / (end - start)) * 100;
    if (position >= 0 && position <= 100) {
      ticks.push({
        label: cursor.toLocaleDateString("en-GB", {
          month: "short",
          timeZone: "UTC",
        }),
        position,
      });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return ticks;
}

/**
 * Gantt-style phase timeline. Renders on the server — no chart library — so
 * it prints correctly in the weekly executive report.
 */
export function Gantt({ bars, windowStart, windowEnd, today }: GanttProps) {
  if (!bars.length) return null;

  const start = ms(
    windowStart ?? bars.reduce((min, b) => (b.plannedStart < min ? b.plannedStart : min), bars[0].plannedStart),
  );
  const end = ms(
    windowEnd ?? bars.reduce((max, b) => (b.plannedFinish > max ? b.plannedFinish : max), bars[0].plannedFinish),
  );
  const span = Math.max(end - start, 1);
  const ticks = monthTicks(start, end);
  const todayPos = today
    ? ((ms(today) - start) / span) * 100
    : null;

  const place = (from: string, to: string) => {
    const left = ((ms(from) - start) / span) * 100;
    const width = ((ms(to) - ms(from)) / span) * 100;
    return {
      left: `${Math.max(0, Math.min(100, left))}%`,
      width: `${Math.max(1, Math.min(100 - Math.max(0, left), width))}%`,
    };
  };

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <div className="min-w-[46rem]">
        {/* Month scale */}
        <div className="relative mb-2 ml-[16rem] h-5 border-b border-border">
          {ticks.map((t) => (
            <span
              key={`${t.label}-${t.position}`}
              className="absolute -translate-x-1/2 text-[10px] uppercase tracking-wide text-muted-foreground"
              style={{ left: `${t.position}%` }}
            >
              {t.label}
            </span>
          ))}
        </div>

        <div className="space-y-2">
          {bars.map((bar) => {
            const planned = place(bar.plannedStart, bar.plannedFinish);
            const actual =
              bar.actualStart
                ? place(bar.actualStart, bar.actualFinish ?? today ?? bar.plannedFinish)
                : null;
            const tone = toneFor(bar.status);

            return (
              <div key={bar.id} className="flex items-center gap-3">
                <div className="w-[15rem] shrink-0 pr-2">
                  <p className="truncate text-sm font-medium" title={bar.name}>
                    {bar.name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {formatDate(bar.plannedStart)} → {formatDate(bar.plannedFinish)}
                  </p>
                </div>

                <div className="relative h-10 flex-1 rounded bg-muted/50">
                  {todayPos !== null && todayPos >= 0 && todayPos <= 100 && (
                    <span
                      aria-hidden
                      className="absolute top-0 z-10 h-full w-px bg-destructive/70"
                      style={{ left: `${todayPos}%` }}
                    />
                  )}

                  {/* Planned */}
                  <div
                    className="absolute top-1.5 h-3 rounded-sm border border-dashed border-muted-foreground/50 bg-muted-foreground/10"
                    style={planned}
                    title={`Planned: ${formatDate(bar.plannedStart)} – ${formatDate(bar.plannedFinish)}`}
                  />

                  {/* Actual + progress fill */}
                  {actual && (
                    <div
                      className="absolute top-5 h-4 overflow-hidden rounded-sm bg-muted"
                      style={actual}
                      title={`Actual: ${formatDate(bar.actualStart!)} – ${
                        bar.actualFinish ? formatDate(bar.actualFinish) : "in progress"
                      }`}
                    >
                      <div
                        className={cn("h-full", TONE_DOT[tone])}
                        style={{ width: `${Math.max(2, Math.min(100, bar.progress))}%` }}
                      />
                    </div>
                  )}
                </div>

                <div className="flex w-[11rem] shrink-0 items-center justify-end gap-2">
                  <span className="text-xs font-medium tabular-nums">
                    {Math.round(bar.progress)}%
                  </span>
                  <StatusBadge status={bar.status} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm border border-dashed border-muted-foreground/50 bg-muted-foreground/10" />
            Planned
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-6 rounded-sm bg-primary" />
            Actual / progress
          </span>
          {today && (
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-px bg-destructive/70" />
              Today ({formatDate(today)})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
